const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Admin Dashboard
router.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        res.render('admin-login', { error: null });
    } else {
        // Ambil data booking dari database
        const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings GROUP BY blok_booking';
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
                    A: { max: 100, booked: 0 },
                    B: { max: 140, booked: 0 },
                    C: { max: 140, booked: 0 },
                    D: { max: 140, booked: 0 },
                    E: { max: 140, booked: 0 },
                    F: { max: 100, booked: 0 },
                    Yudistira: { max: 200, booked: 0 }
                };

                bookingResults.forEach(row => {
                    if (seatData[row.blok_booking]) {
                        seatData[row.blok_booking].booked = row.total_seat || 0;
                    }
                });

                const bookingsQuery = 'SELECT b.*, d.nama_distrik FROM bookings b LEFT JOIN distrik d ON b.distrik = d.id';
                db.query(bookingsQuery, (err, bookings) => {
                    if (err) {
                        console.error('Error fetching bookings:', err);
                        return res.status(500).send('Internal Server Error');
                    }

                    res.render('admin-dashboard', { seatData, bookings, distrikList: distrikResults });
                });
            });
        });
    }
});

// dashboard blok yudistira
router.get('/yudis', (req, res) => {
    if (!req.session.loggedIn) {
        res.render('admin-login', { error: null });
    }
    else {
        const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings  where blok_booking = "Yudistira" GROUP BY blok_booking';
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
                    Yudistira: { max: 200, booked: 0 }
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
    }
});

// Proses Login
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

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin');
    });
});

// Middleware untuk parsing JSON
router.use(express.json());

// Update booking
router.post('/update-booking/:id', (req, res) => {
    const { id } = req.params;
    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;

    let query = 'UPDATE bookings SET ';
    const values = [];
    if (nama !== undefined && nama.trim() !== '') {
        query += 'nama = ?, ';
        values.push(nama);
    }
    if (distrik !== undefined && distrik.trim() !== '') {
        query += 'distrik = ?, ';
        values.push(distrik);
    }
    if (asal_sidang !== undefined && asal_sidang.trim() !== '') {
        query += 'asal_sidang = ?, ';
        values.push(asal_sidang);
    }
    if (blok_booking !== undefined && blok_booking.trim() !== '') {
        query += 'blok_booking = ?, ';
        values.push(blok_booking);
    }
    if (no_wa !== undefined && no_wa.trim() !== '') {
        query += 'no_wa = ?, ';
        values.push(no_wa);
    }
    if (jumlah_seat !== undefined && jumlah_seat.trim() !== '') {
        query += 'jumlah_seat = ?, ';
        values.push(jumlah_seat);
    }

    if (values.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diupdate.' });
    }

    query = query.slice(0, -2);
    query += ' WHERE id = ?';
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

// Delete booking
router.delete('/delete-booking/:id', (req, res) => {
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

module.exports = router;
