const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking Gedung Yuditira
router.get('/', (req, res) => {
    // res.render('booking_gedung_yudistira');

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
                F: { max: 100, booked: 0 }
            };

            bookingResults.forEach(row => {
                if (seatData[row.blok_booking]) {
                    seatData[row.blok_booking].booked = row.total_seat || 0;
                }
            });

            res.render('booking_gedung_yudistira', { seatData, distrikList: distrikResults });
        });
    });
});

// Proses Booking Gedung 1
router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, no_wa, jumlah_seat, blok_booking } = req.body;

    // Validasi: Pastikan jumlah seat adalah 1
    if (jumlah_seat !== '1') {
        return res.status(400).send('Jumlah seat harus 1.');
    }

    const query = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat], (err, result) => {
        if (err) {
            console.error('Error during booking:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/booking_gedung_yudistira');
        }
    });
});

module.exports = router;
