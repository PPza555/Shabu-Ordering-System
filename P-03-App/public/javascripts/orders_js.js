document.querySelectorAll('.change-status-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const orderId = this.dataset.orderId;
        // Show a temporary message
        const msg = document.createElement('div');
        msg.className = "alert alert-success mt-2";
        msg.textContent = "กำลังเปลี่ยนสถานะ...";
        btn.parentNode.appendChild(msg);

        fetch('/order-status/' + orderId, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    msg.textContent = "เปลี่ยนสถานะสำเร็จ กำลังรีเฟรช...";
                    setTimeout(() => location.reload(), 1000);
                } else {
                    msg.className = "alert alert-danger mt-2";
                    msg.textContent = "เปลี่ยนสถานะไม่สำเร็จ";
                    setTimeout(() => msg.remove(), 1500);
                }
            });
    });
});

const socket = io();

socket.on('newOrder', function(order) {
    location.reload();
});