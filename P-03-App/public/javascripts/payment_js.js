window.socket = io();

const payBtn = document.querySelector('#paymentForm button[type="submit"]');
const noItems = window.noItems === 'true';

if (noItems) {
    payBtn.disabled = true;
    payBtn.classList.add('btn-secondary');
    payBtn.classList.remove('btn-success');
    payBtn.textContent = 'ไม่สามารถชำระเงินได้ (ไม่มีรายการอาหาร)';
}

document.getElementById('paymentForm').addEventListener('submit', function (e) {
    if (noItems) {
        e.preventDefault();
        const msg = document.getElementById('paymentMsg');
        msg.innerHTML = '<div class="alert alert-warning">ไม่สามารถชำระเงินได้ เนื่องจากไม่มีรายการอาหาร</div>';
        return;
    }
    e.preventDefault();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentMethodModal')).show();
});

document.getElementById('payWithQRBtn').addEventListener('click', function () {
    const table_id = document.getElementById('table_id').value;
    const amount = document.querySelector('.fw-bold.fs-4.text-success').textContent.replace(/[^0-9.]/g, '');
    const qrString = `${window.location.origin}/payment/success?table_id=${table_id}&amount=${amount}`;
    const qrArea2 = document.getElementById('qrArea2');
    qrArea2.innerHTML = '';

    const canvas = document.createElement('canvas');
    qrArea2.appendChild(canvas);

    QRCode.toCanvas(canvas, qrString, function (error) {
        if (error) qrArea2.textContent = 'เกิดข้อผิดพลาดในการสร้าง QR';
    });

    bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentMethodModal')).hide();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('qrPaymentModal')).show();
});
document.getElementById('payAtCashierBtn').addEventListener('click', function () {
    const table_id = document.getElementById('table_id').value;
    const amount = document.querySelector('.fw-bold.fs-4.text-success').textContent.replace(/[^0-9.]/g, '');
    fetch('/api/payment/cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id, amount })
    })
        .then(res => res.json())
        .then(data => {
            if (window.socket) {
                window.socket.emit('paymentCashier', { table_id, amount });
            }
            bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentMethodModal')).hide();
            const msg = document.getElementById('paymentMsg');
            if (data.success) {
                msg.innerHTML = '<div class="alert alert-info">กรุณาไปที่แคชเชียร์เพื่อชำระเงินและเสร็จสิ้นรายการ</div>';
                setTimeout(() => {
                    window.location.href = '/?table_id=' + table_id;
                }, 2200);
            } else {
                msg.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการบันทึก</div>';
            }
        });
});

window.socket.on('paymentCompleted', function(data) {
    const table_id = document.getElementById('table_id').value;
    if (String(data.table_id) === String(table_id)) {
        const msg = document.getElementById('paymentMsg');
        msg.innerHTML = '<div class="alert alert-success">รายการชำระเงินเสร็จสมบูรณ์</div>';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('qrPaymentModal')).hide();
        setTimeout(() => {
            window.location.href = '/?table_id=' + table_id;
        }, 1800);
    }
});

document.getElementById('skipPaymentBtn').addEventListener('click', function () {
    const table_id = document.getElementById('table_id').value;
    const totalPrice = document.getElementById('totalPrice').textContent.trim().replace(',', '');

    const qrSuccessUrl = `/payment/success?table_id=${table_id}&amount=${totalPrice}`;
    window.open(qrSuccessUrl, '_blank');

    setTimeout(function () {
        window.close();
    }, 500);
});