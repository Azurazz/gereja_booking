const express = require('express');
const util = require('util');
const db = require('../models/db');
const ExcelJS = require('exceljs');

const router = express.Router();
const query = util.promisify(db.query).bind(db);

// const SEAT_LIMITS = require('../config/seatLimits');

/**
 * Checks if the user is authenticated.
 * If the user is logged in, proceeds to the next middleware or route handler.
 * If not, renders the admin login page with an error message.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 * @param {import('express').NextFunction} next - The callback to pass control to the next middleware.
 * @returns {void}
 */
function isAuthenticated(req, res, next) {
    try {
        if (req?.session?.loggedIn) {
            return next();
        }

        res.render('admin-login', { error: 'Silakan login terlebih dahulu' });
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        res.status(500).send('Internal Server Error');
    }
}

// router.use(express.json());

/**
 * Renders the admin dashboard page.
 * This route requires user authentication.
 * The page displays a pie chart showing the booking status for each block.
 * The page also displays a table showing all bookings.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 * @returns {void}
 */
router.get('/', isAuthenticated, (req, res) => {
    const blockQuery = `
        SELECT
            blocks.id,
            blocks.block_name,
            blocks.gedung,
            blocks.seat_limit AS max,
            COALESCE(SUM(bookings.num_seats), 0) AS booked
        FROM blocks
        LEFT JOIN bookings ON bookings.block_id = blocks.id
        GROUP BY blocks.id
    `;
    const distrikQuery = 'SELECT id, nama_distrik FROM distrik';
    const bookingListQuery = `
        SELECT
            bookings.*,
            distrik.*,
            sidang_jemaat.*,
            blocks.*
        FROM bookings
        JOIN distrik ON distrik.id = bookings.distrik_id
        JOIN sidang_jemaat ON sidang_jemaat.id = bookings.sidang_jemaat_id
        JOIN blocks ON blocks.id = bookings.block_id
        ORDER BY bookings.id DESC
    `;

    db.query(blockQuery, (err, seatData) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            return res.status(500).send('Internal Server Error');
        }

        db.query(distrikQuery, (err, distrikResults) => {
            if (err) {
                console.error('Error fetching distrik data:', err);
                return res.status(500).send('Internal Server Error');
            }

            db.query(bookingListQuery, (err, bookings) => {
                if (err) {
                    console.error('Error fetching booking list data:', err);
                    return res.status(500).send('Internal Server Error');
                }

                res.render('admin-dashboard', { seatData, bookings, distrikList: distrikResults });
            });
        });
    });
});

/**
 * Handles POST request to '/login' endpoint.
 * Authenticates user login and starts a session if successful.
 * Redirects to '/admin' if successful, otherwise renders login page with error message.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM admin WHERE username = ? AND password = ?';

    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            res.status(500).send('Internal Server Error');
        } else if (results.length > 0) {
            req.session.loggedIn = true;
            res.redirect('/admin');
        } else {
            res.render('admin-login', { error: 'Username atau password salah' });
        }
    });
});

/**
 * Handles GET request to '/logout' endpoint.
 * Destroys the user session and redirects back to the login page.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin');
    });
});

/**
 * Handles POST request to '/update-booking/:id' endpoint.
 * Updates booking data with the provided fields.
 * Returns JSON response with success status and message.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.post('/update-booking/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid.' });
        }

        const {
            name,
            distrik_id,
            sidang_jemaat_id,
            block_id,
            category,
            class: kelas,
            age,
            whatsapp
        } = req.body;

        if (!name && !distrik_id && !sidang_jemaat_id && !block_id && !category && !kelas && !age && !whatsapp) {
            return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui.' });
        }

        const updateFields = [];
        const values = [];

        if (name) {
            updateFields.push('name = ?');
            values.push(name);
        }
        if (distrik_id) {
            updateFields.push('distrik_id = ?');
            values.push(distrik_id);
        }
        if (sidang_jemaat_id) {
            updateFields.push('sidang_jemaat_id = ?');
            values.push(sidang_jemaat_id);
        }
        if (block_id) {
            updateFields.push('block_id = ?');
            values.push(block_id);
        }
        if (category) {
            updateFields.push('category = ?');
            values.push(category);
        }
        if (kelas) {
            updateFields.push('class = ?');
            values.push(kelas);
        }
        if (age) {
            updateFields.push('age = ?');
            values.push(age);
        }
        if (whatsapp) {
            updateFields.push('whatsapp = ?');
            values.push(whatsapp);
        }

        values.push(id);

        const updateQuery = `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`;

        const result = await query(updateQuery, values);

        if (result.affectedRows > 0) {
            return res.json({ success: true, message: 'Data berhasil diperbarui.' });
        } else {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau tidak ada perubahan.' });
        }
    } catch (error) {
        console.error('Error updating booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengupdate data.', error: error.message });
    }
});

/**
 * Handles DELETE request to '/delete-booking/:id' endpoint.
 * This route requires user authentication.
 * Deletes booking data with the provided ID.
 * Returns JSON response with success status and message.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.delete('/delete-booking/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid.' });
        }

        const queryText = 'DELETE FROM bookings WHERE id = ?';
        const result = await query(queryText, [id]);

        if (result.affectedRows > 0) {
            return res.json({ success: true, message: 'Data berhasil dihapus.' });
        } else {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal menghapus data.', error: error.message });
    }
});


/**
 * Handles GET request to '/export-excel' endpoint.
 * This route requires user authentication.
 * Exports booking data to an Excel file and sends it as a response.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.get('/export-excel', isAuthenticated, (req, res) => {
    const query = `
        SELECT 
            bookings.*, 
            distrik.nama_distrik,
            sidang_jemaat.nama_sidang,
            blocks.block_name
        FROM bookings 
        JOIN distrik ON distrik.id = bookings.distrik_id
        JOIN sidang_jemaat ON sidang_jemaat.id = bookings.sidang_jemaat_id
        JOIN blocks ON blocks.id = bookings.block_id
        ORDER BY bookings.id ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).send('Internal Server Error');
        }
    
        const bookings = results;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Booking');
    
        worksheet.addRow(['Booking ID', 'Nama', 'Distrik', 'Sidang Jemaat', 'Kelas', 'Umur', 'WhatsApp', 'Kategori', 'Blok', 'Jumlah Kursi']);
    
        bookings.forEach((booking) => {
            worksheet.addRow([booking.id, booking.name, booking.nama_distrik, booking.nama_sidang, booking.class, booking.age, booking.whatsapp, booking.category, booking.block_name, booking.num_seats]);
        });
    
        workbook.xlsx.writeBuffer().then((buffer) => {
            const date = new Date();
            const timestamp = date.toISOString().replace(/[:.]/g, '-');

            res.setHeader('Content-Disposition', `attachment; filename=data_booking_${timestamp}.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        });
    });
});

router.get("/booking-datatable", isAuthenticated, async (req, res) => {
    try {
        let draw = req.query.draw;
        let start = parseInt(req.query.start) || 0;
        let length = parseInt(req.query.length) || 10;
        let searchValue = req.query.search?.value || "";
        let distrikFilter = req.query.distrik || "";
        let sidangFilter = req.query.sidang_jemaat || "";
        let blockFilter = req.query.block || "";

        let whereClause = "WHERE 1=1";
        let params = [];

        if (searchValue) {
            whereClause += ` 
                AND (
                    bookings.name LIKE ? 
                    OR distrik.nama_distrik LIKE ?
                    OR sidang_jemaat.nama_sidang LIKE ?
                    OR blocks.block_name LIKE ?
                    OR bookings.category LIKE ?
                )`;
            params.push(
                `%${searchValue}%`, 
                `%${searchValue}%`, 
                `%${searchValue}%`, 
                `%${searchValue}%`, 
                `%${searchValue}%`
            );
        }

        if (distrikFilter) {
            whereClause += " AND distrik.id = ?";
            params.push(distrikFilter);
        }

        if (sidangFilter) {
            whereClause += " AND sidang_jemaat.id = ?";
            params.push(sidangFilter);
        }

        if (blockFilter) {
            whereClause += " AND blocks.id = ?";
            params.push(blockFilter);
        }

        /** 
         * Query to get total data without filter
         */
        const totalQuery = `SELECT COUNT(*) AS total FROM bookings`;
        const totalResult = await query(totalQuery);
        const totalRecords = totalResult[0].total;

        /**
         * Query to get total data after filter is applied
         */
        const filteredQuery = `
            SELECT COUNT(*) AS total 
            FROM bookings 
            JOIN distrik ON distrik.id = bookings.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = bookings.sidang_jemaat_id
            JOIN blocks ON blocks.id = bookings.block_id
            ${whereClause}`;
        const filteredResult = await query(filteredQuery, params);
        const recordsFiltered = filteredResult[0].total;

        /**
         * Main query to get bookings data with filter and pagination
         */
        const dataQuery = `
            SELECT 
                bookings.id,
                bookings.name,
                distrik.nama_distrik,
                sidang_jemaat.nama_sidang,
                blocks.block_name,
                bookings.class,
                bookings.age,
                bookings.whatsapp,
                bookings.category
            FROM bookings
            JOIN distrik ON distrik.id = bookings.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = bookings.sidang_jemaat_id
            JOIN blocks ON blocks.id = bookings.block_id
            ${whereClause}
            ORDER BY bookings.id DESC
            LIMIT ? OFFSET ?`;
        params.push(length, start);
        const bookings = await query(dataQuery, params);

        res.json({
            draw: draw,
            recordsTotal: totalRecords,
            recordsFiltered: recordsFiltered,
            data: bookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

module.exports = router;
