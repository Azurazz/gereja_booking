const express = require('express');
const router = express.Router();
const db = require('../models/db');
const SEAT_LIMITS = require('../config/seatLimits');

const getSeatData = async () => {
    return new Promise((resolve, reject) => {
        const bookingQuery = 'SELECT blok_booking, SUM(jumlah_seat) AS total_seat FROM bookings WHERE blok_booking = "Yudistira" GROUP BY blok_booking';
        
        db.query(bookingQuery, (err, bookingResults) => {
            if (err) {
                return reject(err);
            }

            const seatData = {
                Yudistira: { max: SEAT_LIMITS.Yudistira, booked: 0 }
            };

            bookingResults.forEach(row => {
                if (seatData[row.blok_booking]) {
                    seatData[row.blok_booking].booked = row.total_seat || 0;
                }
            });

            resolve(seatData);
        });
    });
};

/** ROUTES */

router.get('/', async (req, res) => {
    try {
        const distrikQuery = 'SELECT id, nama_distrik FROM distrik';
        const [seatData, distrikResults] = await Promise.all([
            getSeatData(),
            new Promise((resolve, reject) => {
                db.query(distrikQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        res.render('booking_gedung_1', { seatData, distrikList: distrikResults });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/book', (req, res) => {
    const { nama, distrik, asal_sidang, no_wa, jumlah_seat } = req.body;
    const blok_booking = 'Yudistira';

    db.beginTransaction(async (err) => {
        if (err) {
            console.error('Error starting transaction:', err);
            return res.status(500).send('Internal Server Error');
        }

        try {
            const checkQuery = 'SELECT SUM(jumlah_seat) AS total_seat FROM bookings WHERE blok_booking = ? FOR UPDATE';
            const results = await new Promise((resolve, reject) => {
                db.query(checkQuery, [blok_booking], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });

            const totalBooked = results[0].total_seat || 0;
            const maxSeats = SEAT_LIMITS[blok_booking];

            if (totalBooked + parseInt(jumlah_seat) > maxSeats) {
                return db.rollback(() => {
                    res.status(400).send('Jumlah seat tidak mencukupi. Silakan pilih blok lain.');
                });
            }

            const insertQuery = 'INSERT INTO bookings (nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat) VALUES (?, ?, ?, ?, ?, ?)';
            await new Promise((resolve, reject) => {
                db.query(insertQuery, [nama, distrik, asal_sidang, blok_booking, no_wa, jumlah_seat], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            db.commit(err => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error committing transaction:', err);
                        res.status(500).send('Internal Server Error');
                    });
                }
                res.redirect('/booking');
            });

        } catch (error) {
            db.rollback(() => {
                console.error('Error during booking process:', error);
                res.status(500).send('Internal Server Error');
            });
        }
    });
});

module.exports = router;
