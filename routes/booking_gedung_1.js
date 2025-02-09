const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking Gedung 1
router.get('/', (req, res) => {
    res.render('booking_gedung_1');
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
            res.redirect('/booking_gedung_1');
        }
    });
});

module.exports = router;
