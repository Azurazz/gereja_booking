const express = require('express');
const router = express.Router();
const db = require('../models/db');
const ExcelJS = require('exceljs');

const SEAT_LIMITS = require('../config/seatLimits');

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

router.use(express.json());

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
    const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings GROUP BY blok_booking';
    const distrikQuery = 'SELECT id, nama_distrik FROM distrik';
    const bookingListQuery = 'SELECT b.*, d.nama_distrik FROM bookings b LEFT JOIN distrik d ON b.distrik = d.id ORDER BY b.id DESC';

    let seatData = {
        A: { max: SEAT_LIMITS.A, booked: 0 },
        B: { max: SEAT_LIMITS.B, booked: 0 },
        C: { max: SEAT_LIMITS.C, booked: 0 },
        D: { max: SEAT_LIMITS.D, booked: 0 },
        E: { max: SEAT_LIMITS.E, booked: 0 },
        F: { max: SEAT_LIMITS.F, booked: 0 },
        Yudistira: { max: SEAT_LIMITS.Yudistira, booked: 0 }
    };

    db.query(bookingQuery, (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            return res.status(500).send('Internal Server Error');
        }

        bookingResults.forEach(row => {
            if (seatData[row.blok_booking]) {
                seatData[row.blok_booking].booked = (row.total_seat || 0);
            }
        });

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
 * Route handler for fetching and rendering booking data for 'Yudistira' block.
 * This route requires user authentication.
 * It fetches booking data, distrik data, and individual bookings for 'Yudistira',
 * and then renders the 'admin-gedung' view with this data.
 *
 * @param {import('express').Request} req - The HTTP request object.
 * @param {import('express').Response} res - The HTTP response object.
 */
router.get('/yudis', isAuthenticated, (req, res) => {
    const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings WHERE blok_booking = "Yudistira" GROUP BY blok_booking';
    const distrikQuery = 'SELECT id, nama_distrik FROM distrik';

    db.query(bookingQuery, (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            return res.status(500).send('Internal Server Error');
        }

        db.query(distrikQuery, (err, distrikResults) => {
            if (err) {
                console.error('Error fetching distrik data:', err);
                return res.status(500).send('Internal Server Error');
            }

            const seatData = {
                Yudistira: { max: SEAT_LIMITS.Yudistira, booked: 0 }
            };

            bookingResults.forEach(row => {
                if (seatData[row.blok_booking]) {
                    seatData[row.blok_booking].booked = row.total_seat || 0;
                }
            });

            const bookingsQuery = 'SELECT b.*, d.nama_distrik FROM bookings b LEFT JOIN distrik d ON b.distrik = d.id WHERE blok_booking = "Yudistira"';

            db.query(bookingsQuery, (err, bookings) => {
                if (err) {
                    console.error('Error fetching bookings:', err);
                    return res.status(500).send('Internal Server Error');
                }

                res.render('admin-gedung', { seatData, bookings, distrikList: distrikResults });
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
router.post('/update-booking/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    }

    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;
    const updateFields = [];
    const values = [];

    if (nama) {
        updateFields.push('nama = ?');
        values.push(nama);
    }
    if (distrik) {
        updateFields.push('distrik = ?');
        values.push(distrik);
    }
    if (asal_sidang) {
        updateFields.push('asal_sidang = ?');
        values.push(asal_sidang);
    }
    if (blok_booking) {
        updateFields.push('blok_booking = ?');
        values.push(blok_booking);
    }
    if (no_wa) {
        updateFields.push('no_wa = ?');
        values.push(no_wa);
    }
    if (jumlah_seat) {
        updateFields.push('jumlah_seat = ?');
        values.push(jumlah_seat);
    }

    if (values.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui.' });
    }

    const query = `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = ?`;
    values.push(id);

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error updating booking:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengupdate data.' });
        }

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil diupdate.' });
        } else {
            res.json({ success: false, message: 'Data tidak ditemukan atau tidak ada perubahan.' });
        }
    });
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
router.delete('/delete-booking/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID tidak valid.' });
    }

    const query = 'DELETE FROM bookings WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error deleting booking:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus data.' });
        }

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil dihapus.' });
        } else {
            res.json({ success: false, message: 'Data tidak ditemukan.' });
        }
    });
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
    const query = 'SELECT bookings.*, distrik.nama_distrik FROM bookings LEFT JOIN distrik ON bookings.distrik = distrik.id ORDER BY bookings.id ASC';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).send('Internal Server Error');
        }
    
        const bookings = results;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data Booking');
    
        worksheet.addRow(['Booking ID', 'Nama', 'Distrik', 'Sidang Jemaat', 'Blok Booking', 'No WA', 'Jumlah Seat']);
    
        bookings.forEach((booking) => {
            worksheet.addRow([booking.id, booking.nama, booking.nama_distrik, booking.asal_sidang, booking.blok_booking, booking.no_wa, booking.jumlah_seat]);
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

module.exports = router;
