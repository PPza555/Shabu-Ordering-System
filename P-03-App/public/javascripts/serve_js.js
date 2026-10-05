document.querySelectorAll('.serve-done-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        const msg = document.createElement('div');
        msg.className = "alert alert-success mt-2";
        msg.textContent = "กำลังอัปเดตสถานะ...";
        btn.parentNode.appendChild(msg);

        fetch('/serve-done/' + orderId, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    msg.textContent = "อัปเดตสถานะเสร็จสิ้น กำลังรีเฟรช...";
                    setTimeout(() => location.reload(), 1000);
                } else {
                    msg.className = "alert alert-danger mt-2";
                    msg.textContent = "อัปเดตสถานะไม่สำเร็จ";
                    setTimeout(() => msg.remove(), 1500);
                }
            });
    });
});

document.querySelectorAll('.print-receipt-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const tableNumber = btn.dataset.tableNumber;
        const orderId = btn.dataset.orderId;
        const orderTime = btn.dataset.orderTime;
        const orderBody = btn.closest('.accordion-body');
        const itemsList = Array.from(orderBody.querySelectorAll('.list-group-item')).map(li => {
            const qty = li.querySelector('.badge.bg-secondary')?.textContent.replace('x', '') || '';
            const name = li.querySelector('span')?.childNodes[0]?.textContent.trim() || '';
            const size = li.querySelector('.badge.bg-info')?.textContent || '';
            const price = li.dataset.price ? Number(li.dataset.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
            return `<div style="display:flex;justify-content:space-between;">
        <span>[${qty}] ${name} [${size}]</span>
        <span>${price} บาท</span>
    </div>`;
        }).join('');

        const receiptWindow = window.open('', '', 'width=350,height=600');
        receiptWindow.document.write(`
    <html>
    <head>
        <title>ใบเสร็จ</title>
        <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />
        <style>
            @media print {
                @page { size: 80mm auto; margin: 5mm; }
                body { width: 80mm !important; }
            }
            body { padding: 12px; font-family: sans-serif; width: 80mm; }
            h2 { margin-bottom: 12px; font-size: 1.2em; }
            .receipt-item { font-size: 1em; padding: 4px 0; display: flex; justify-content: space-between; }
            .text-end { font-size: 0.95em; }
        </style>
    </head>
    <body>
        <h2 class="text-center">ใบรายการอาหาร</h2>
        <div><strong>โต๊ะ:</strong> ${(tableNumber !== undefined && tableNumber !== null && tableNumber !== '') ? tableNumber : '0'}</div>
        <div><strong>หมายเลขออเดอร์:</strong> ${orderId}</div>
        <div><strong>เวลา:</strong> ${orderTime}</div>
        <hr>
        <div><strong>รายการอาหาร:</strong></div>
        ${itemsList}
        <hr>
        <script>
            window.onload = function() { window.print(); }
        <\/script>
    </body>
    </html>
`);
        receiptWindow.document.close();
    });
});

const socket = io();
socket.on('orderServed', function (data) {
    location.reload();
});