DROP TABLE IF EXISTS blocks;

CREATE TABLE
    blocks (
        id INT (11) AUTO_INCREMENT PRIMARY KEY,
        block_name VARCHAR(255) NOT NULL,
        seat_limit INT (11) NOT NULL,
        gedung VARCHAR(20) NOT NULL -- Hastinapurapura, Yudistira
    );

DROP TABLE IF EXISTS bookings;

CREATE TABLE
    bookings (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        class VARCHAR(10), -- field untuk kategori anak
        age INT (11), -- field untuk kategori anak
        whatsapp varchar(15), -- field untuk kategori pendamping, orang tua anak, umum
        category VARCHAR(50) NOT NULL, -- anak, pendamping, orang tua anak, umum
        num_seats INT (11) NOT NULL,
        distrik_id INT (11) NOT NULL,
        sidang_jemaat_id INT (11) NOT NULL,
        block_id INT(11) NOT NULL,
        booking_code VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL -- untuk soft delete
    );

DROP TABLE IF EXISTS booking_details;

CREATE TABLE
    booking_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_code VARCHAR(50) NOT NULL UNIQUE,
        distrik_id INT (11) NOT NULL,
        sidang_jemaat_id INT (11) NOT NULL,
        block_id INT(11) NOT NULL,
        num_seats INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (1, 'A', 0, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (2, 'B', 120, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (3, 'C', 120, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (4, 'D', 105, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (5, 'E', 135, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (6, 'F', 60, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (7, 'G', 0, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (8, 'H', 0, 'Hastinapura');

INSERT INTO
    blocks (`id`, `block_name`, `seat_limit`, `gedung`)
VALUES
    (9, 'Yudistira', 200, 'Yudistira');