const express = require('express');
const util = require('util');
const router = express.Router();
const db = require('../models/db');
const beginTransaction = util.promisify(db.beginTransaction).bind(db);
const commit = util.promisify(db.commit).bind(db);
const rollback = util.promisify(db.rollback).bind(db);
// const SEAT_LIMITS = require('../config/seatLimits');

const getSeatInfo = async (gedung = null, block_id = null) => {
    return new Promise((resolve, reject) => {
        let blockQuery = `
            SELECT
                blocks.id,
                blocks.block_name,
                blocks.gedung,
                blocks.seat_limit AS max,
                COALESCE(SUM(bookings.num_seats), 0) AS booked
            FROM blocks
            LEFT JOIN bookings ON bookings.block_id = blocks.id
        `;

        let params = [];

        if (gedung !== null) {
            blockQuery += ` WHERE blocks.gedung = ?`;
            params.push(gedung);

            blockQuery += ` GROUP BY blocks.id`;
        } else if (block_id !== null) {
            blockQuery += ` WHERE blocks.id = ?`;
            params.push(block_id);

            blockQuery += ` GROUP BY blocks.id FOR UPDATE`;
        }


        db.query(blockQuery, (params), (err, seatInfoResults) => {
            if (err) {
                console.error('Error fetching seat info:', err);
                return reject(err);
            }

            if (!seatInfoResults || seatInfoResults.length === 0) {
                console.error('No seat info data found.');
                return reject(new Error('No seat info data found.'));
            }

            resolve(seatInfoResults);
        });
    });
};

/**
 * ROUTES
 */

router.get('/', async (req, res) => {
    try {
        const distrikQuery = 'SELECT * FROM distrik';
        const [seatData, distrikResults] = await Promise.all([
            getSeatInfo('Hastina'),
            new Promise((resolve, reject) => {
                db.query(distrikQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        res.render('booking', { seatData, distrikList: distrikResults });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/success', async (req, res) => {
    try {
        const data = req.query.data ? JSON.parse(req.query.data) : null;
        res.render('success', { data });
    } catch (error) {
        console.error("Error parsing success data:", error);
        res.render('success', { data: null });
    }
});

router.get('/asal-sidang/:distrikId', (req, res) => {
    const { distrikId } = req.params;
    const query = 'SELECT id, nama_sidang FROM sidang_jemaat WHERE id_distrik = ?';

    db.query(query, [distrikId], (err, results) => {
        if (err) {
            console.error('Error fetching asal sidang data:', err);
            return res.status(500).send('Internal Server Error');
        }

        res.json(results);
    });
});

router.post('/book', async (req, res) => {
    const reqBody = req.body;

    if (!reqBody || !reqBody.distrik_id || !reqBody.sidang_jemaat_id || !reqBody.block_id || !reqBody.num_seats) {
        return res.status(400).json({ success: false, message: 'Input tidak valid.' });
    }

    try {
        await beginTransaction();

        const seatData = await getSeatInfo(null, reqBody.block_id);

        if (!seatData || !seatData.length) {
            await rollback();
            return res.status(400).json({ success: false, message: 'Blok tidak ditemukan.' });
        }

        const totalBooked = parseInt(seatData[0].booked);
        const maxSeats = parseInt(seatData[0].max);

        if (totalBooked + parseInt(reqBody.num_seats) > maxSeats) {
            await rollback();
            return res.status(400).json({ success: false, message: 'Jumlah kursi sudah tidak mencukupi. Silakan pilih blok lain.' });
        }

        const distrikQuery = 'SELECT * FROM distrik WHERE id = ?';
        const sidangQuery = 'SELECT * FROM sidang_jemaat WHERE id = ?';
        const [distrikData, sidangData] = await Promise.all([
            new Promise((resolve, reject) => {
                db.query(distrikQuery, [reqBody.distrik_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(sidangQuery, [reqBody.sidang_jemaat_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            })
        ]);

        let savedData = {
            distrik_id: reqBody.distrik_id,
            distrik_name: distrikData[0].nama_distrik,
            sidang_jemaat_id: reqBody.sidang_jemaat_id,
            sidang_jemaat_name: sidangData[0].nama_sidang,
            block_id: reqBody.block_id,
            block_name: seatData[0].block_name,
            gedung: seatData[0].gedung,
            num_seats: reqBody.num_seats,
            bookings: []
        };

        if (Array.isArray(reqBody.child_name)) {
            for (let i = 0; i < reqBody.child_name.length; i++) {
                const insertChild = `
                    INSERT INTO bookings (name, class, age, category, num_seats, distrik_id, sidang_jemaat_id, block_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const result = await new Promise((resolve, reject) => {
                    db.query(
                        insertChild,
                        [
                            reqBody.child_name[i],
                            reqBody.child_class[i] || null,
                            reqBody.child_age[i] || null,
                            'Anak',
                            1,
                            reqBody.distrik_id,
                            reqBody.sidang_jemaat_id,
                            reqBody.block_id
                        ],
                        (err, result) => {
                            if (err) {
                                console.error("❌ Error insert anak:", err);
                                return reject(err);
                            }

                            resolve(result);
                        }
                    );
                });

                savedData.bookings.push({
                    id: result.insertId,
                    name: reqBody.child_name[i],
                    class: reqBody.child_class[i] || null,
                    age: reqBody.child_age[i] || null,
                    whatsapp: null,
                    category: 'Anak',
                    num_seats: 1,
                    distrik_id: reqBody.distrik_id,
                    distrik_name: distrikData[0].nama_distrik,
                    sidang_jemaat_id: reqBody.sidang_jemaat_id,
                    sidang_jemaat_name: sidangData[0].nama_sidang,
                    block_id: reqBody.block_id,
                    block_name: seatData[0].block_name,
                });
            }
        } else {
            await rollback();
            return res.status(400).json({ success: false, message: 'child_name bukan array.' });
        }

        if (Array.isArray(reqBody.pendamping_name)) {
            for (let i = 0; i < reqBody.pendamping_name.length; i++) {
                const insertPendamping = `
                    INSERT INTO bookings (name, whatsapp, category, num_seats, distrik_id, sidang_jemaat_id, block_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                const result = await new Promise((resolve, reject) => {
                    db.query(
                        insertPendamping,
                        [
                            reqBody.pendamping_name[i],
                            reqBody.pendamping_whatsapp[i] || null,
                            'Pendamping',
                            1,
                            reqBody.distrik_id,
                            reqBody.sidang_jemaat_id,
                            reqBody.block_id
                        ],
                        (err, result) => {
                            if (err) {
                                console.error("❌ Error insert pendamping:", err);
                                return reject(err);
                            }

                            resolve(result);
                        }
                    );
                });

                savedData.bookings.push({
                    id: result.insertId,
                    name: reqBody.pendamping_name[i],
                    class: null,
                    age: null,
                    whatsapp: reqBody.pendamping_whatsapp[i] || null,
                    category: 'Pendamping',
                    num_seats: 1,
                    distrik_id: reqBody.distrik_id,
                    distrik_name: distrikData[0].nama_distrik,
                    sidang_jemaat_id: reqBody.sidang_jemaat_id,
                    sidang_jemaat_name: sidangData[0].nama_sidang,
                    block_id: reqBody.block_id,
                    block_name: seatData[0].block_name
                });
            }
        } else {
            await rollback();
            return res.status(400).json({ success: false, message: 'pendamping_name bukan array.' });
        }

        await commit();
        res.json({ success: true, message: "Booking berhasil! Mohon tunggu sebentar. Anda akan dialihkan ke halaman berikutnya.", data: savedData });
    } catch (error) {
        await rollback();
        console.error('Error during booking process:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem. Silakan coba lagi.' });
    }
});

module.exports = router;
