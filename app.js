const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const homeRoutes = require('./routes/home'); // Impor homeRoutes
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');
const bookingGedung1Routes = require('./routes/booking_gedung_1');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use('/', homeRoutes); // Gunakan homeRoutes
app.use('/booking', bookingRoutes);
app.use('/admin', adminRoutes);
app.use('/booking_gedung_1', bookingGedung1Routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`app running at http://localhost:${PORT}`)
});