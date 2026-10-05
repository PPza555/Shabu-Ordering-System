let currentTableNum = null;
let currentSummaryData = null;

document.querySelectorAll('.table-block').forEach(block => {
    block.addEventListener('click', function(e) {
        e.preventDefault();
        const tableNum = this.textContent.trim();
        currentTableNum = tableNum;
        fetch(`/api/payment-summary?table_id=${tableNum}`)
            .then(res => res.json())
            .then(data => {
                currentSummaryData = data;
                let html = '<ul class="list-group mb-3">';
                let total = 0;
                data.items.forEach(item => {
                    let basePrice = item.price || 0;
                    let displayPrice = basePrice;
                    if (item.size === 'L') displayPrice = basePrice * 1.2;
                    else if (item.size === 'S') displayPrice = basePrice * 0.8;
                    // Default (M or undefined) is basePrice

                    const itemTotal = displayPrice * item.quantity;
                    total += itemTotal;
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${item.item_name} <span class="badge bg-info ms-2">${item.size}</span> x${item.quantity}</span>
                        <span>
                            ${Number(displayPrice).toLocaleString('en-US', {minimumFractionDigits: 2})} บาท
                            <span class="ms-2 text-muted">รวม ${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                        </span>
                    </li>`;
                });
                html += '</ul>';
                html += `<div class="mb-2 text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>`;
                const vat = Math.round(total * 0.07 * 100) / 100;
                html += `<div class="mb-2 text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>`;
                html += `<div class="mb-2 text-end fs-5">ยอดสุทธิ: <strong>${(total + vat).toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>`;
                document.getElementById('paymentSummaryBody').innerHTML = html;
                bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentSummaryModal')).show();
            });
    });
});

// Finish transaction button
document.getElementById('finishTransactionBtn').addEventListener('click', function() {
    if (!currentTableNum) return;
    fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: currentTableNum })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('paymentSummaryBody').innerHTML += '<div class="alert alert-success mt-3">รายการชำระเงินเสร็จสิ้น!</div>';
            setTimeout(() => location.reload(), 1200);
        } else {
            document.getElementById('paymentSummaryBody').innerHTML += '<div class="alert alert-danger mt-3">เกิดข้อผิดพลาดในการชำระเงิน</div>';
        }
    });
});

// Print receipt button
document.getElementById('printReceiptBtn').addEventListener('click', function() {
    if (!currentSummaryData || !currentTableNum) return;
    let itemsHtml = currentSummaryData.items.map(item => {
        let basePrice = item.price || 0;
        let displayPrice = basePrice;
        if (item.size === 'L') displayPrice = basePrice * 1.2;
        else if (item.size === 'S') displayPrice = basePrice * 0.8;
        // Default (M or undefined) is basePrice

        const itemTotal = displayPrice * item.quantity;
        return `<div style="display:flex;justify-content:space-between;">
            <span>[${item.quantity}] ${item.item_name} [${item.size}]</span>
            <span>${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
        </div>`;
    }).join('');
    let total = items.reduce((sum, item) => {
        let basePrice = item.price || 0;
        let displayPrice = basePrice;
        if (item.size === 'L') displayPrice = basePrice * 1.2;
        else if (item.size === 'S') displayPrice = basePrice * 0.8;
        return sum + displayPrice * item.quantity;
    }, 0);
    let vat = Math.round(total * 0.07 * 100) / 100;
    let final = total + vat;
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
            </styl>
        </head>
        <body>
            <h2 class="text-center">ใบเสร็จ</h2>
            <div><strong>โต๊ะ:</strong> ${currentTableNum}</div>
            <hr>
            <div><strong>รายการอาหาร:</strong></div>
            ${itemsHtml}
            <hr>
            <div class="text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end fs-5">ยอดสุทธิ: <strong>${final.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end mt-3"><em>ขอบคุณที่ใช้บริการ!</em></div>
            <script>
                window.onload = function() { window.print(); }
            <\/script>
        </body>
        </html>
    `);
    receiptWindow.document.close();
});

document.querySelectorAll('.payment-row').forEach(row => {
    row.addEventListener('click', function() {
        const tableNum = this.dataset.table;
        const amount = Number(this.dataset.amount).toLocaleString('en-US', {minimumFractionDigits: 2});
        const paidAt = this.dataset.paidat;

        // Fetch menu items for this table (unpaid orders)
        fetch(`/api/payment-summary?table_id=${tableNum}`)
            .then(res => res.json())
            .then(data => {
                let itemsHtml = '<ul class="list-group mb-3">';
                let total = 0;
                data.items.forEach(item => {
                    let basePrice = item.price || 0;
                    let displayPrice = basePrice;
                    if (item.size === 'L') displayPrice = basePrice * 1.2;
                    else if (item.size === 'S') displayPrice = basePrice * 0.8;
                    // Default (M or undefined) is basePrice

                    const itemTotal = displayPrice * item.quantity;
                    total += itemTotal;
                    itemsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>[${item.quantity}] ${item.item_name} [${item.size}]</span>
                        <span>${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                    </li>`;
                });
                itemsHtml += '</ul>';
                const vat = Math.round(total * 0.07 * 100) / 100;
                const final = total + vat;

                let html = `
                    <div>โต๊ะ: <strong>${tableNum}</strong></div>
                    <div>เวลา: <span class="text-muted">${paidAt}</span></div>
                    <hr>
                    <div><strong>รายการอาหาร:</strong></div>
                    ${itemsHtml}
                    <div class="mb-2 text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                    <div class="mb-2 text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                    <div class="mb-2 text-end fs-5">ยอดสุทธิ: <strong>${final.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                `;
                document.getElementById('cashierPaymentBody').innerHTML = html;
                document.getElementById('cashierCompleteBtn').dataset.table = tableNum;
                document.getElementById('cashierCompleteBtn').dataset.amount = final;
                document.getElementById('cashierPrintBtn').dataset.table = tableNum;
                document.getElementById('cashierPrintBtn').dataset.amount = final;
                document.getElementById('cashierPrintBtn').dataset.items = JSON.stringify(data.items);
                bootstrap.Modal.getOrCreateInstance(document.getElementById('cashierPaymentModal')).show();
            });
    });
});

// Complete transaction button
document.getElementById('cashierCompleteBtn').addEventListener('click', function() {
    const tableNum = this.dataset.table;
    fetch('/api/payment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableNum })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById('cashierPaymentBody').innerHTML += '<div class="alert alert-success mt-3">รายการชำระเงินเสร็จสิ้น!</div>';
            setTimeout(() => location.reload(), 1200);
        } else {
            document.getElementById('cashierPaymentBody').innerHTML += '<div class="alert alert-danger mt-3">เกิดข้อผิดพลาดในการชำระเงิน</div>';
        }
    });
});

// Print receipt button
document.getElementById('cashierPrintBtn').addEventListener('click', function() {
    const tableNum = this.dataset.table;
    const amount = Number(this.dataset.amount).toLocaleString('en-US', {minimumFractionDigits: 2});
    const items = JSON.parse(this.dataset.items || '[]');
    let itemsHtml = items.map(item => {
        let basePrice = item.price || 0;
        let displayPrice = basePrice;
        if (item.size === 'L') displayPrice = basePrice * 1.2;
        else if (item.size === 'S') displayPrice = basePrice * 0.8;
        // Default (M or undefined) is basePrice

        const itemTotal = displayPrice * item.quantity;
        return `<div style="display:flex;justify-content:space-between;">
            <span>[${item.quantity}] ${item.item_name} [${item.size}]</span>
            <span>${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
        </div>`;
    }).join('');
    let total = items.reduce((sum, item) => {
        let basePrice = item.price || 0;
        let displayPrice = basePrice;
        if (item.size === 'L') displayPrice = basePrice * 1.2;
        else if (item.size === 'S') displayPrice = basePrice * 0.8;
        return sum + displayPrice * item.quantity;
    }, 0);
    let vat = Math.round(total * 0.07 * 100) / 100;
    let final = total + vat;
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
                .text-end { font-size: 0.95em; }
            </style>
        </head>
        <body>
            <h2 class="text-center">ใบเสร็จ</h2>
            <div><strong>โต๊ะ:</strong> ${tableNum}</div>
            <hr>
            <div><strong>รายการอาหาร:</strong></div>
            ${itemsHtml}
            <hr>
            <div class="text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end fs-5">ยอดสุทธิ: <strong>${final.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
            <div class="text-end mt-3"><em>ขอบคุณที่ใช้บริการ!</em></div>
            <script>
                window.onload = function() { window.print(); }
            <\/script>
        </body>
        </html>
    `);
    receiptWindow.document.close();
});

window.socket = io();
window.socket.on('paymentSkipped', function(data) {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '32px';
    notif.style.right = '-400px'; // Start offscreen
    notif.style.background = 'rgba(40,167,69,0.95)';
    notif.style.color = '#fff';
    notif.style.padding = '18px 32px';
    notif.style.borderRadius = '12px';
    notif.style.boxShadow = '0 2px 12px #0002';
    notif.style.fontSize = '1.2em';
    notif.style.zIndex = '9999';
    notif.style.transition = 'right 0.8s cubic-bezier(.25,.8,.25,1), opacity 0.6s';
    notif.style.opacity = '1';
    notif.innerHTML = `โต๊ะ ${data.table_id} ชำระเงินแล้ว<br>ยอดสุทธิ ${Number(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})} บาท`;
    document.body.appendChild(notif);

    // Animate in
    setTimeout(() => {
        notif.style.right = '32px';
    }, 20);

    // Animate out
    setTimeout(() => {
        notif.style.right = '-400px';
        notif.style.opacity = '0';
    }, 3500);

    // Remove from DOM after animation
    setTimeout(() => notif.remove(), 4200);
});

window.socket.on('paymentCashier', function(data) {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '32px';
    notif.style.right = '-400px';
    notif.style.background = 'rgba(0,123,255,0.95)';
    notif.style.color = '#fff';
    notif.style.padding = '18px 32px';
    notif.style.borderRadius = '12px';
    notif.style.boxShadow = '0 2px 12px #0002';
    notif.style.fontSize = '1.2em';
    notif.style.zIndex = '9999';
    notif.style.transition = 'right 0.8s cubic-bezier(.25,.8,.25,1), opacity 0.6s';
    notif.style.opacity = '1';
    notif.innerHTML = `โต๊ะ ${data.table_id} ขอชำระเงินที่แคชเชียร์<br>ยอดสุทธิ ${Number(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})} บาท`;
    document.body.appendChild(notif);

    setTimeout(() => { notif.style.right = '32px'; }, 20);
    setTimeout(() => { notif.style.right = '-400px'; notif.style.opacity = '0'; }, 3500);
    setTimeout(() => notif.remove(), 4200);
});

window.socket.on('paymentCompleted', function(data) {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '32px';
    notif.style.right = '-400px';
    notif.style.background = 'rgba(40,167,69,0.95)';
    notif.style.color = '#fff';
    notif.style.padding = '18px 32px';
    notif.style.borderRadius = '12px';
    notif.style.boxShadow = '0 2px 12px #0002';
    notif.style.fontSize = '1.2em';
    notif.style.zIndex = '9999';
    notif.style.transition = 'right 0.8s cubic-bezier(.25,.8,.25,1), opacity 0.6s';
    notif.style.opacity = '1';
    notif.innerHTML = `โต๊ะ ${data.table_id} ชำระเงินผ่าน QR แล้ว<br>ยอดสุทธิ ${Number(data.amount).toLocaleString('en-US', {minimumFractionDigits: 2})} บาท`;
    document.body.appendChild(notif);

    setTimeout(() => { notif.style.right = '32px'; }, 20);
    setTimeout(() => { notif.style.right = '-400px'; notif.style.opacity = '0'; }, 3500);
    setTimeout(() => notif.remove(), 4200);
});

// Example for cashier (left column)
window.socket.on('newPayment', function(payment) {
    if (payment.method === 'cashier' && payment.paid === 0) {
        const cashierList = document.querySelector('.col-md-6 .list-group');
        if (cashierList) {
            const emptyRow = cashierList.querySelector('.text-center.text-muted');
            if (emptyRow) emptyRow.remove();

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center payment-row';
            li.setAttribute('data-table', payment.table_number);
            li.setAttribute('data-amount', payment.amount);
            li.setAttribute('data-paidat', payment.paid_at);
            li.innerHTML = `
                <span>โต๊ะ <strong>${payment.table_number}</strong></span>
                <span>ยอดสุทธิ <strong>${Number(payment.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong> บาท</span>
                <span class="text-muted small">เวลา: ${payment.paid_at}</span>
            `;
            // Attach click handler
            li.addEventListener('click', function() {
                const tableNum = this.dataset.table;
                const paidAt = this.dataset.paidat;
                fetch(`/api/payment-summary?table_id=${tableNum}`)
                    .then(res => res.json())
                    .then(data => {
                        let itemsHtml = '<ul class="list-group mb-3">';
                        let total = 0;
                        data.items.forEach(item => {
                            let basePrice = item.price || 0;
                            let displayPrice = basePrice;
                            if (item.size === 'L') displayPrice = basePrice * 1.2;
                            else if (item.size === 'S') displayPrice = basePrice * 0.8;
                            const itemTotal = displayPrice * item.quantity;
                            total += itemTotal;
                            itemsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>[${item.quantity}] ${item.item_name} [${item.size}]</span>
                                <span>${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                            </li>`;
                        });
                        itemsHtml += '</ul>';
                        const vat = Math.round(total * 0.07 * 100) / 100;
                        const final = total + vat;

                        let html = `
                            <div>โต๊ะ: <strong>${tableNum}</strong></div>
                            <div>เวลา: <span class="text-muted">${paidAt}</span></div>
                            <hr>
                            <div><strong>รายการอาหาร:</strong></div>
                            ${itemsHtml}
                            <div class="mb-2 text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                            <div class="mb-2 text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                            <div class="mb-2 text-end fs-5">ยอดสุทธิ: <strong>${final.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                        `;
                        document.getElementById('cashierPaymentBody').innerHTML = html;
                        document.getElementById('cashierCompleteBtn').dataset.table = tableNum;
                        document.getElementById('cashierCompleteBtn').dataset.amount = final;
                        document.getElementById('cashierPrintBtn').dataset.table = tableNum;
                        document.getElementById('cashierPrintBtn').dataset.amount = final;
                        document.getElementById('cashierPrintBtn').dataset.items = JSON.stringify(data.items);
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('cashierPaymentModal')).show();
                    });
            });
            cashierList.appendChild(li);
        }
    }
});

// Do the same for QR payments in paymentCompleted handler
window.socket.on('paymentCompleted', function(payment) {
    const qrList = document.getElementById('qrList');
    if (qrList) {
        const emptyRow = qrList.querySelector('.text-center.text-muted');
        if (emptyRow) emptyRow.remove();

        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center payment-row';
        li.setAttribute('data-table', payment.table_id || payment.table_number);
        li.setAttribute('data-amount', payment.amount);
        li.setAttribute('data-paidat', payment.paid_at);
        li.innerHTML = `
            <span>โต๊ะ <strong>${payment.table_id || payment.table_number}</strong></span>
            <span>ยอดสุทธิ <strong>${Number(payment.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong> บาท</span>
            <span class="text-muted small">เวลา: ${payment.paid_at}</span>
        `;
        // Attach click handler
        li.addEventListener('click', function() {
            const tableNum = this.dataset.table;
            const paidAt = this.dataset.paidat;
            fetch(`/api/payment-summary?table_id=${tableNum}`)
                .then(res => res.json())
                .then(data => {
                    let itemsHtml = '<ul class="list-group mb-3">';
                    let total = 0;
                    data.items.forEach(item => {
                        let basePrice = item.price || 0;
                        let displayPrice = basePrice;
                        if (item.size === 'L') displayPrice = basePrice * 1.2;
                        else if (item.size === 'S') displayPrice = basePrice * 0.8;
                        const itemTotal = displayPrice * item.quantity;
                        total += itemTotal;
                        itemsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>[${item.quantity}] ${item.item_name} [${item.size}]</span>
                            <span>${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</span>
                        </li>`;
                    });
                    itemsHtml += '</ul>';
                    const vat = Math.round(total * 0.07 * 100) / 100;
                    const final = total + vat;

                    let html = `
                        <div>โต๊ะ: <strong>${tableNum}</strong></div>
                        <div>เวลา: <span class="text-muted">${paidAt}</span></div>
                        <hr>
                        <div><strong>รายการอาหาร:</strong></div>
                        ${itemsHtml}
                        <div class="mb-2 text-end">รวมทั้งหมด: <strong>${total.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                        <div class="mb-2 text-end">VAT 7%: <strong>${vat.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                        <div class="mb-2 text-end fs-5">ยอดสุทธิ: <strong>${final.toLocaleString('en-US', {minimumFractionDigits: 2})} บาท</strong></div>
                    `;
                    document.getElementById('cashierPaymentBody').innerHTML = html;
                    document.getElementById('cashierCompleteBtn').dataset.table = tableNum;
                    document.getElementById('cashierCompleteBtn').dataset.amount = final;
                    document.getElementById('cashierPrintBtn').dataset.table = tableNum;
                    document.getElementById('cashierPrintBtn').dataset.amount = final;
                    document.getElementById('cashierPrintBtn').dataset.items = JSON.stringify(data.items);
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('cashierPaymentModal')).show();
                });
        });
        qrList.appendChild(li);
    }
});