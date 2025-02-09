document.addEventListener('DOMContentLoaded', () => {
    const editButtons = document.querySelectorAll('.btn-edit');
    const deleteButtons = document.querySelectorAll('.btn-delete');
    const modal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');
    const editForm = document.getElementById('editForm');
    const burger = document.querySelector('.burger');
    const navUl = document.querySelector('nav ul');
    const header = document.querySelector('header');

    // Buka modal saat tombol edit diklik
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const id = row.getAttribute('data-id'); // Ambil ID dari atribut data-id
            const nama = row.cells[0].textContent.trim();
            const distrik = row.cells[1].textContent.trim(); // Ambil data distrik
            const asalSidang = row.cells[2].textContent.trim();
            const blokBooking = row.cells[3].textContent.trim();
            const noWa = row.cells[4].textContent.trim();
            const jumlahSeat = row.cells[5].textContent.trim();

            // Isi form edit dengan data yang ada
            document.getElementById('editId').value = id;
            document.getElementById('editNama').value = nama;
            document.getElementById('editDistrik').value = distrik;
            document.getElementById('editAsalSidang').value = asalSidang;
            document.getElementById('editBlokBooking').value = blokBooking;
            document.getElementById('editNoWa').value = noWa;
            document.getElementById('editJumlahSeat').value = jumlahSeat;

            // Debugging: Cetak data yang diambil
            console.log('Data yang diambil:', { id, nama, distrik, asalSidang, blokBooking, noWa, jumlahSeat });

            // Tampilkan modal
            modal.style.display = 'block';
        });
    });

    // Tutup modal saat tombol close diklik
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Tutup modal saat klik di luar modal
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Kirim form edit
    editForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // Ambil data dari form
        const formData = new FormData(editForm);
        const data = {};
        formData.forEach((value, key) => {
            if (value.trim() !== '') { // Hanya kirim jika value tidak kosong
                data[key] = value;
            }
        });

        const id = data.id; // Ambil ID dari form
        delete data.id; // Hapus ID dari data yang akan dikirim

        // Debugging: Cetak data yang dikirim
        console.log('Data yang dikirim:', data);

        // Kirim data ke backend
        fetch(`/admin/update-booking/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Pastikan header diatur ke JSON
            },
            body: JSON.stringify(data), // Kirim data sebagai JSON
        })
        .then(response => response.json())
        .then(result => {
            // Debugging: Cetak respons dari server
            console.log('Respons dari server:', result);

            if (result.success) {
                alert('Data berhasil diupdate!');
                modal.style.display = 'none'; // Tutup modal
                window.location.reload(); // Reload halaman
            } else {
                alert(result.message || 'Gagal mengupdate data.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat mengupdate data.');
        });
    });

    // Hapus data
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                fetch(`/admin/delete-booking/${id}`, {
                    method: 'DELETE',
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert('Data berhasil dihapus!');
                        window.location.reload();
                    } else {
                        alert(result.message || 'Gagal menghapus data.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Terjadi kesalahan saat menghapus data.');
                });
            }
        });
    });

    // Toggle navbar saat burger diklik
    burger.addEventListener('click', () => {
        navUl.classList.toggle('active');
    });

    // Sembunyikan navbar saat tidak ada interaksi atau saat scroll
    let isScrolling;
    window.addEventListener('scroll', () => {
        // Sembunyikan navbar saat scroll
        header.classList.add('scrolled');
        navUl.classList.remove('active');

        // Reset timer saat ada interaksi scroll
        clearTimeout(isScrolling);

        // Set timeout untuk menampilkan navbar setelah scroll berhenti
        isScrolling = setTimeout(() => {
            header.classList.remove('scrolled');
        }, 500); // Waktu delay setelah scroll berhenti (ms)
    });

    // Sembunyikan navbar setelah beberapa detik tidak ada interaksi
    let inactivityTime;
    const resetInactivityTimer = () => {
        clearTimeout(inactivityTime);
        inactivityTime = setTimeout(() => {
            header.classList.add('scrolled');
            navUl.classList.remove('active');
        }, 3000); // Waktu delay setelah tidak ada interaksi (ms)
    };

    // Reset timer saat ada interaksi (klik, scroll, dll)
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);

    // Inisialisasi timer
    resetInactivityTimer();
});
