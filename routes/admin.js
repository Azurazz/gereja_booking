const express = require('express');
const util = require('util');
const db = require('../models/db');
const ExcelJS = require('exceljs');
const constants = require("../helpers/constants");

const pdf = require("html-pdf");
const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");

const router = express.Router();
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);
const query = util.promisify(db.query).bind(db);

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

/**
 * VIEW ROUTES
 */

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
            (
                SELECT COALESCE(SUM(bookings.num_seats), 0)
                FROM bookings
                WHERE 
                    bookings.deleted_at IS NULL
                    AND bookings.block_id = blocks.id
            ) booked
        FROM blocks
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
        WHERE bookings.deleted_at IS NULL
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
 * AJAX ROUTES
 */

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

        let {
            name,
            distrik_id,
            sidang_jemaat_id,
            block_id,
            category,
            class: kelas,
            age,
            whatsapp,
            is_padus,
            booking_code
        } = req.body;

        if (is_padus == 1) {
            block_id = constants.BLOCK_ID_PADUS;
        } else {
            const getBookingQueryText = `
                SELECT
                    bookings.*
                FROM bookings
                WHERE 
                    bookings.booking_code = ?
                    AND (
                        bookings.is_padus = 0
                        OR bookings.is_padus IS NULL
                    )
                LIMIT 1
            `;
            const bookingData = await query(getBookingQueryText, [booking_code]);

            if (bookingData.length === 0) {
                return res.status(404).json({ success: false, message: `Data dengan Booking Code ${booking_code} tidak ditemukan.` });
            }

            block_id = bookingData[0].block_id;
        }

        if (!name && !distrik_id && !sidang_jemaat_id && !block_id && !category && !kelas && !age && !whatsapp && !is_padus && !booking_code) {
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
        if (is_padus) {
            updateFields.push('is_padus = ?');
            values.push(is_padus);
        }

        values.push(id);

        await beginTransaction();

        const updateQuery = `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`;

        const result = await query(updateQuery, values);

        const protocol = req.protocol;
        const host = req.get("host");
        const pdfPath = await regeneratePDF(protocol, host, booking_code);

        if (result.affectedRows > 0) {
            await commit();
            return res.json({ success: true, message: 'Data berhasil diperbarui.' });
        } else {
            await rollback();
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau tidak ada perubahan.' });
        }
    } catch (error) {
        await rollback();
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

        const queryText = 'UPDATE bookings SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL';
        const result = await query(queryText, [id]);

        if (result.affectedRows > 0) {
            return res.json({ success: true, message: 'Data berhasil dihapus (soft delete).' });
        } else {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau sudah dihapus sebelumnya.' });
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal menghapus data.', error: error.message });
    }
});

router.post('/restore-deleted-booking/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID tidak valid.' });
        }

        const seatCheckQuery = `
            SELECT
                bookings.block_id,
                blocks.block_name,
                (
                    blocks.seat_limit - (
                        SELECT COALESCE(SUM(b.num_seats), 0)
                        FROM bookings b
                        WHERE
                            b.block_id = bookings.block_id
                            AND b.deleted_at IS NULL
                    )
                ) AS available_seats
            FROM bookings
            JOIN blocks ON bookings.block_id = blocks.id
            WHERE
                bookings.id = ?
        `;
        const seatCheckResult = await query(seatCheckQuery, [id]);

        if (seatCheckResult.length === 0 || seatCheckResult[0].available_seats <= 0) {
            return res.status(400).json({ success: false, message: `Seat untuk Blok ${seatCheckResult[0].block_name} sudah tidak tersedia untuk pengaktifan kembali.` });
        }

        const queryText = 'UPDATE bookings SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL';
        const result = await query(queryText, [id]);

        if (result.affectedRows > 0) {
            return res.json({ success: true, message: 'Data berhasil diaktifkan (soft delete).' });
        } else {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau sudah diaktifkan sebelumnya.' });
        }
    } catch (error) {
        console.error('Error activating booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengaktifkan data.', error: error.message });
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
    
        worksheet.addRow([
            'Booking ID', 
            'Nama', 
            'Distrik', 
            'Sidang Jemaat', 
            'Kelas', 
            'Umur', 
            'WhatsApp', 
            'Kategori', 
            // 'Tim Padus', 
            'Blok', 
            'Jumlah Kursi',
            'Booking Kode',
            'Created At',
            'Updated At',
            'Deleted At'
        ]);
    
        bookings.forEach((booking) => {
            worksheet.addRow([
                booking.id, 
                booking.name, 
                booking.nama_distrik, 
                booking.nama_sidang, 
                booking.class, 
                booking.age, 
                booking.whatsapp, 
                booking.category, 
                // booking.is_padus == 1 ? 'Ya' : 'Tidak', 
                booking.block_name, 
                booking.num_seats,
                booking.booking_code,
                booking.created_at,
                booking.updated_at,
                booking.deleted_at
            ]);
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
        let categoryFilter = req.query.category || "";
        let statusFilter = req.query.status || "";
        let padusFilter = req.query.padus || "";

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
                    OR bookings.booking_code LIKE ?
                )`;
            params.push(
                `%${searchValue}%`, 
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

        if (categoryFilter) {
            whereClause += " AND bookings.category = ?";
            params.push(categoryFilter);
        }
        
        if (padusFilter) {
            whereClause += " AND bookings.is_padus = ?";
            params.push(padusFilter);
        }

        if (statusFilter) {
            switch (statusFilter) {
                case "active":
                    whereClause += " AND bookings.deleted_at IS NULL";
                    break;
                case "deleted":
                    whereClause += " AND bookings.deleted_at IS NOT NULL";
                    break;
                default:
                    break;
            }
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
                bookings.category,
                bookings.is_padus,
                bookings.booking_code,
                bookings.deleted_at
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

router.get("/booking-detail-datatable", isAuthenticated, async (req, res) => {
    try {
        let draw = req.query.draw;
        let start = parseInt(req.query.start) || 0;
        let length = parseInt(req.query.length) || 10;
        let searchValue = req.query.search?.value || "";

        let distrikFilter = req.query.distrik || "";
        let sidangFilter = req.query.sidang_jemaat || "";
        let blockFilter = req.query.block || "";
        let statusFilter = req.query.status || "";

        let whereClause = "WHERE 1=1";
        let params = [];

        if (searchValue) {
            whereClause += ` 
                AND (
                    booking_details.booking_code LIKE ? 
                    OR distrik.nama_distrik LIKE ?
                    OR sidang_jemaat.nama_sidang LIKE ?
                    OR blocks.block_name LIKE ?
                )`;
            params.push(
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

        if (statusFilter) {
            switch (statusFilter) {
                case "active":
                    whereClause += " AND booking_details.deleted_at IS NULL";
                    break;
                case "deleted":
                    whereClause += " AND booking_details.deleted_at IS NOT NULL";
                    break;
                default:
                    break;
            }
        }

        /** 
         * Query to get total data without filter
         */
        const totalQuery = `SELECT COUNT(*) AS total FROM booking_details`;
        const totalResult = await query(totalQuery);
        const totalRecords = totalResult[0].total;

        /**
         * Query to get total data after filter is applied
         */
        const filteredQuery = `
            SELECT COUNT(*) AS total 
            FROM booking_details 
            JOIN distrik ON distrik.id = booking_details.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = booking_details.sidang_jemaat_id
            JOIN blocks ON blocks.id = booking_details.block_id
            ${whereClause}`;
        const filteredResult = await query(filteredQuery, params);
        const recordsFiltered = filteredResult[0].total;

        /**
         * Main query to get bookings data with filter and pagination
         */
        const dataQuery = `
            SELECT 
                booking_details.id,
                booking_details.booking_code,
                distrik.nama_distrik,
                sidang_jemaat.nama_sidang,
                blocks.block_name,
                booking_details.num_seats,
                booking_details.created_at,
                booking_details.deleted_at
            FROM booking_details
            JOIN distrik ON distrik.id = booking_details.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = booking_details.sidang_jemaat_id
            JOIN blocks ON blocks.id = booking_details.block_id
            ${whereClause}
            ORDER BY booking_details.id DESC
            LIMIT ? OFFSET ?`;
        params.push(length, start);
        const bookingDetails = await query(dataQuery, params);

        res.json({
            draw: draw,
            recordsTotal: totalRecords,
            recordsFiltered: recordsFiltered,
            data: bookingDetails
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

router.get("/booking-sidang-jemaat-datatable", isAuthenticated, async (req, res) => {
    try {
        let draw = req.query.draw;
        let start = parseInt(req.query.start) || 0;
        let length = parseInt(req.query.length) || 10;
        let searchValue = req.query.search?.value || "";

        let distrikFilter = req.query.distrik || "";
        let sidangFilter = req.query.sidang_jemaat || "";

        let whereClause = "WHERE 1=1";
        let params = [];

        if (searchValue) {
            whereClause += ` 
                AND (
                    distrik.nama_distrik LIKE ?
                    OR sidang_jemaat.nama_sidang LIKE ?
                )`;
            params.push(
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

        /** 
         * Query to get total data without filter
         */
        const totalQuery = `SELECT COUNT(*) AS total FROM sidang_jemaat`;
        const totalResult = await query(totalQuery);
        const totalRecords = totalResult[0].total;

        /**
         * Query to get total data after filter is applied
         */
        const filteredQuery = `
            SELECT COUNT(*) AS total
            FROM sidang_jemaat
            LEFT JOIN distrik ON distrik.id = sidang_jemaat.id_distrik
            ${whereClause}`;
        const filteredResult = await query(filteredQuery, params);
        const recordsFiltered = filteredResult[0].total;

        /**
         * Main query to get bookings data with filter and pagination
         */
        const dataQuery = `
            SELECT
                sidang_jemaat.id,
                sidang_jemaat.nama_sidang,
                distrik.nama_distrik,
                coalesce(
                    (
                        SELECT
                            sum(booking_details.num_seats)
                        FROM booking_details
                        LEFT JOIN blocks ON blocks.id = booking_details.block_id
                        WHERE
                            booking_details.sidang_jemaat_id = sidang_jemaat.id
                            AND booking_details.deleted_at IS NULL
                            AND blocks.gedung = 'Hastinapura'
                    ), 0
                ) AS jumlah_kursi_hastinapura,
                coalesce(
                    (
                        SELECT
                            sum(booking_details.num_seats)
                        FROM booking_details
                        LEFT JOIN blocks ON blocks.id = booking_details.block_id
                        WHERE
                            booking_details.sidang_jemaat_id = sidang_jemaat.id
                            AND booking_details.deleted_at IS NULL
                            AND blocks.gedung = 'Yudistira'
                    ), 0
                ) AS jumlah_kursi_yudistira
            FROM sidang_jemaat
            LEFT JOIN distrik ON distrik.id = sidang_jemaat.id_distrik
            ${whereClause}
            ORDER BY
                distrik.nama_distrik ASC,
                sidang_jemaat.nama_sidang ASC
            LIMIT ? OFFSET ?`;
        params.push(length, start);
        const bookingSidangJemaat = await query(dataQuery, params);

        res.json({
            draw: draw,
            recordsTotal: totalRecords,
            recordsFiltered: recordsFiltered,
            data: bookingSidangJemaat
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
});

/**
 * Handles GET request to '/get-seat-data' endpoint.
 * This route requires user authentication.
 * Returns JSON response with available seat data.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.get('/get-seat-data', isAuthenticated, async (req, res) => {
    try {
        const blockQuery = `
            SELECT 
                blocks.id,
                blocks.block_name,
                blocks.seat_limit,
                (
					SELECT COALESCE(SUM(bookings.num_seats), 0)
                    FROM bookings
                    WHERE 
						bookings.deleted_at IS NULL
                        AND bookings.block_id = blocks.id
                ) booked
            FROM blocks
        `;

        const result = await query(blockQuery);

        const seatData = result.map((block) => {
            return {
                block_name: block.block_name,
                max: block.seat_limit,
                booked: block.booked,
                available: block.seat_limit - block.booked,
            };
        });

        res.json(seatData);
    } catch (error) {
        console.error('Error fetching seat data:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.delete('/delete-booking-detail/:booking_code', isAuthenticated, async (req, res) => {
    try {
        const { booking_code } = req.params;

        if (!booking_code || typeof booking_code !== 'string') {
            return res.status(400).json({ success: false, message: 'Booking Code tidak valid.' });
        }

        await beginTransaction();

        const bookingDetailsQueryText = `
            UPDATE booking_details SET deleted_at = NOW() WHERE booking_code = ? AND deleted_at IS NULL;
        `;
        const bookingsQueryText = `
            UPDATE bookings SET deleted_at = NOW() WHERE booking_code = ? AND deleted_at IS NULL;
        `;

        const bookingDetailsResult = await query(bookingDetailsQueryText, [booking_code]);
        const bookingsResult = await query(bookingsQueryText, [booking_code]);

        if (bookingDetailsResult.affectedRows > 0 && bookingsResult.affectedRows > 0) {
            await commit();
            return res.json({ success: true, message: 'Data berhasil dihapus (soft delete).' });
        } else {
            await rollback();
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau sudah dihapus sebelumnya.' });
        }
    } catch (error) {
        await rollback();
        console.error('Error deleting booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal menghapus data.', error: error.message });
    }
});

router.post('/restore-deleted-booking-detail/:booking_code', isAuthenticated, async (req, res) => {
    try {
        const { booking_code } = req.params;

        if (!booking_code || typeof booking_code !== 'string') {
            return res.status(400).json({ success: false, message: 'Booking Code tidak valid.' });
        }

        await beginTransaction();

        const getBookingDetailsQueryText = `
            SELECT
                booking_details.id,
                booking_details.booking_code,
                booking_details.sidang_jemaat_id,
                sidang_jemaat.nama_sidang,
                blocks.gedung
            FROM booking_details
            LEFT JOIN sidang_jemaat ON sidang_jemaat.id = booking_details.sidang_jemaat_id
            LEFT JOIN blocks ON blocks.id = booking_details.block_id
            WHERE booking_details.booking_code = ?
            LIMIT 1
        `;
        const getBookingDetailsResult = await query(getBookingDetailsQueryText, [booking_code]);

        if (getBookingDetailsResult.length === 0) {
            await rollback();
            return res.status(404).json({ success: false, message: `Data dengan Booking Code ${booking_code} tidak ditemukan.` });
        }

        if (getBookingDetailsResult[0].gedung === 'Hastinapura') {
            const checkBookingDetailsQueryText = `
                SELECT
                    COUNT(*) AS count
                FROM booking_details
                LEFT JOIN blocks ON blocks.id = booking_details.block_id
                WHERE
                    sidang_jemaat_id = ?
                    AND deleted_at IS NULL
                    AND gedung = ?
            `;
            const checkBookingDetailsResult = await query(checkBookingDetailsQueryText, [getBookingDetailsResult[0].sidang_jemaat_id, getBookingDetailsResult[0].gedung]);

            if (checkBookingDetailsResult[0].count > 0) {
                await rollback();
                return res.status(400).json({ success: false, message: `Sidang Jemaat ${getBookingDetailsResult[0].nama_sidang} sudah booking di gedung ${getBookingDetailsResult[0].gedung}.` });
            }
        }

        const seatCheckQuery = `
            SELECT
                bookings.block_id,
                blocks.block_name,
                (
                    blocks.seat_limit - (
                        SELECT COALESCE(SUM(b.num_seats), 0)
                        FROM bookings b
                        WHERE
                            b.block_id = bookings.block_id
                            AND b.deleted_at IS NULL
                    )
                ) AS available_seats
            FROM bookings
            JOIN blocks ON bookings.block_id = blocks.id
            WHERE
                bookings.booking_code = ?
        `;
        const seatCheckResult = await query(seatCheckQuery, [booking_code]);

        if (seatCheckResult.length === 0 || seatCheckResult[0].available_seats <= 0) {
            await rollback();
            return res.status(400).json({ success: false, message: `Seat untuk Blok ${seatCheckResult[0].block_name} sudah tidak tersedia untuk pengaktifan kembali.` });
        }

        const bookingDetailsQueryText = `
            UPDATE booking_details SET deleted_at = NULL WHERE booking_code = ? AND deleted_at IS NOT NULL;
        `;
        const bookingsQueryText = `
            UPDATE bookings SET deleted_at = NULL WHERE booking_code = ? AND deleted_at IS NOT NULL;
        `;

        const bookingDetailsResult = await query(bookingDetailsQueryText, [booking_code]);
        const bookingsResult = await query(bookingsQueryText, [booking_code]);

        if (bookingDetailsResult.affectedRows > 0 && bookingsResult.affectedRows > 0) {
            if (seatCheckResult[0].available_seats < bookingsResult.affectedRows) {
                await rollback();
                return res.status(400).json({ success: false, message: `Seat untuk Blok ${seatCheckResult[0].block_name} sudah tidak tersedia untuk pengaktifan kembali.` });
            }

            await commit();
            return res.json({ success: true, message: 'Data berhasil diaktifkan (soft delete).' });
        } else {
            await rollback();
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau sudah diaktifkan sebelumnya.' });
        }
    } catch (error) {
        await rollback();
        console.error('Error activating booking:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengaktifkan data.', error: error.message });
    }
});

const regeneratePDF = async (protocol, host, booking_code) => {
    try {
        const bookingDetailsQuery = `
            SELECT
                booking_details.distrik_id,
                distrik.nama_distrik AS distrik_name,
                booking_details.id AS sidang_jemaat_id,
                sidang_jemaat.nama_sidang AS sidang_jemaat_name,
                booking_details.block_id,
                blocks.block_name,
                blocks.gedung,
                booking_details.num_seats,
                booking_details.booking_code
            FROM booking_details
            JOIN distrik ON distrik.id = booking_details.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = booking_details.sidang_jemaat_id
            JOIN blocks ON blocks.id = booking_details.block_id
            WHERE booking_details.booking_code = ?
        `;
        let bookingDetailData = await query(bookingDetailsQuery, [booking_code]);

        if (bookingDetailData.length === 0) {
            throw new Error("Data Booking Details tidak ditemukan.");
        }

        data = {
            distrik_id: bookingDetailData[0].distrik_id,
            distrik_name: bookingDetailData[0].distrik_name,
            sidang_jemaat_id: bookingDetailData[0].sidang_jemaat_id,
            sidang_jemaat_name: bookingDetailData[0].sidang_jemaat_name,
            block_id: bookingDetailData[0].block_id,
            block_name: bookingDetailData[0].block_name,
            gedung: bookingDetailData[0].gedung,
            num_seats: bookingDetailData[0].num_seats,
            booking_code: bookingDetailData[0].booking_code,
            bookings: []
        };

        const bookingsQuery = `
            SELECT
                bookings.id,
                bookings.name,
                bookings.class,
                bookings.age,
                bookings.whatsapp,
                bookings.category,
                bookings.num_seats,
                bookings.distrik_id,
                distrik.nama_distrik AS distrik_name,
                bookings.sidang_jemaat_id,
                sidang_jemaat.nama_sidang AS sidang_jemaat_name,
                bookings.block_id,
                blocks.block_name,
                bookings.booking_code,
                bookings.is_padus
            FROM bookings
            JOIN distrik ON distrik.id = bookings.distrik_id
            JOIN sidang_jemaat ON sidang_jemaat.id = bookings.sidang_jemaat_id
            JOIN blocks ON blocks.id = bookings.block_id
            WHERE bookings.booking_code = ?
        `;
        let bookingData = await query(bookingsQuery, [booking_code]);

        if (bookingData.length === 0) {
            throw new Error("Data Booking tidak ditemukan.");
        }

        for (let i = 0; i < bookingData.length; i++) {
            data.bookings.push({
                id: bookingData[i].id,
                name: bookingData[i].name,
                class: bookingData[i].class,
                age: bookingData[i].age,
                whatsapp: bookingData[i].whatsapp,
                category: bookingData[i].category,
                num_seats: bookingData[i].num_seats,
                distrik_id: bookingData[i].distrik_id,
                distrik_name: bookingData[i].distrik_name,
                sidang_jemaat_id: bookingData[i].sidang_jemaat_id,
                sidang_jemaat_name: bookingData[i].sidang_jemaat_name,
                block_id: bookingData[i].block_id,
                block_name: bookingData[i].block_name,
                booking_code: bookingData[i].booking_code,
                is_padus: bookingData[i].is_padus
            });
        }

        await generatePDF(protocol, host, data, booking_code);
    } catch (error) {
        console.error("❌ Error regenerating PDF:", error);
        throw new Error("Gagal membuat bukti pemesanan.");
    }
}

const generatePDF = async (protocol, host, bookingData, bookingCode) => {
    try {
        const templatePath = path.join(__dirname, "..", "views", "templates", "bukti-pemesanan-pdf.ejs");
        const rootPath = path.resolve(__dirname, "..");
        const storageDir = path.join(rootPath, "public", "storage", "pdf");
        const relativePath = `storage/pdf/${bookingCode}.pdf`;
        const outputPath = path.join(rootPath, "public", relativePath);

        await fs.mkdir(storageDir, { recursive: true });

        const template = await fs.readFile(templatePath, "utf-8");
        const html = ejs.render(template, { protocol, host, booking: bookingData });

        let timeStamp = new Date().toLocaleString("id-ID", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        let timeZone = () => {
            const offset = new Date().getTimezoneOffset();
            if (offset === -420) return "WIB (UTC+7)";
            if (offset === -480) return "WITA (UTC+8)";
            if (offset === -540) return "WIT (UTC+9)";
            return "Zona Waktu Tidak Diketahui";
        }

        return new Promise((resolve, reject) => {
            pdf.create(html, {
                format: "A4",
                border: "10mm",
                footer: {
                    height: "5mm",
                    contents: `
                        <div style="font-size:10px; text-align:center; width:100%; color: #555; line-height: 1.4;">
                            <p style="margin: 1px 0; line-height: 1;">Dokumen ini dibuat secara otomatis oleh sistem.</p>
                            <p style="margin: 1px 0; line-height: 1;">Dibuat pada: ${timeStamp} ${timeZone()}</p>
                        </div>
                    `
                }
            }).toFile(outputPath, (err, res) => {
                if (err) {
                    reject("Gagal membuat PDF");
                } else {
                    resolve(relativePath);
                }
            });
        });
    } catch (error) {
        console.error("❌ Error generating PDF:", error);
        throw new Error("Gagal membuat bukti pemesanan.");
    }
}

module.exports = router;
