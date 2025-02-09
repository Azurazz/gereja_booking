const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking
router.get('/', (req, res) => {
    // Ambil data booking dari database
    const query = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings GROUP BY blok_booking';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching booking data:', err);
            res.status(500).send('Internal Server Error');
        } else {
            // Format data untuk memudahkan penggunaan di EJS
            const seatData = {
                A: { max: 100, booked: 0 },
                B: { max: 140, booked: 0 },
                C: { max: 140, booked: 0 },
                D: { max: 140, booked: 0 },
                E: { max: 140, booked: 0 },
                F: { max: 100, booked: 0 }
            };

            // Update jumlah seat yang sudah terbooking
            results.forEach(row => {
                if (seatData[row.blok_booking]) {
                    seatData[row.blok_booking].booked = row.total_seat || 0;
                }
            });

            // Render halaman booking dengan data seat
            res.render('booking', { seatData });
        }
    });
});

// Proses Booking
router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;
    const query = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat], (err, result) => {
        if (err) {
            console.error('Error during booking:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/booking');
        }
    });
});

module.exports = router;