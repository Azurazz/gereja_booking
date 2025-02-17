const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Halaman Booking Gedung Hastina
router.get('/', (req, res) => {
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

            res.render('booking_gedung_hastina', { seatData, distrikList: distrikResults });
        });
    });
});

// Proses Booking
router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat } = req.body;
    const query = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';

    console.log('req.body:', req.body);
    db.query(query, [nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat], (err, result) => {
        if (err) {
            console.error('Error during booking:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/booking_gedung_hastina');
        }
    });
});

router.get('/get-sidang/:id_distrik', (req, res) => {
    const idDistrik = req.params.id_distrik;
    const query = 'SELECT id, nama_sidang FROM sidang_jemaat WHERE id_distrik = ? ORDER BY nama_sidang ASC';

    db.query(query, [idDistrik], (err, results) => {
        if (err) {
            console.error('Error fetching sidang jemaat data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(results);
    });
});

module.exports = router;
