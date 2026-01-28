export const Charts = {
    clear(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    resize(canvas) {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
    },

    getCSSVar(name) {
        return getComputedStyle(document.body).getPropertyValue(name).trim();
    },

    pie(canvas, data) {
        this.resize(canvas);
        const ctx = canvas.getContext('2d');
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        let startAngle = 0;
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        let colorIdx = 0;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        if (total === 0) {
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText("No Data", centerX, centerY);
            return;
        }

        for (const [cat, value] of Object.entries(data)) {
            const sliceAngle = (value / total) * 2 * Math.PI;
            ctx.fillStyle = colors[colorIdx % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            startAngle += sliceAngle;
            colorIdx++;
        }
        
        // Donut hole
        ctx.fillStyle = this.getCSSVar('--bg-card');
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fill();
    },

    bar(canvas, dataObj) {
        this.resize(canvas);
        const ctx = canvas.getContext('2d');
        const data = Object.values(dataObj);
        if (data.length === 0) return;

        const max = Math.max(...data) || 100;
        const padding = 40;
        const chartHeight = canvas.height - padding * 2;
        const barWidth = (canvas.width - padding * 2) / data.length - 20;

        ctx.fillStyle = this.getCSSVar('--text-muted');
        ctx.font = '12px sans-serif';

        data.forEach((val, i) => {
            const barHeight = (val / max) * chartHeight;
            const x = padding + i * (barWidth + 20);
            const y = canvas.height - padding - barHeight;

            ctx.fillStyle = '#2563eb';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = this.getCSSVar('--text-muted');
            ctx.textAlign = 'center';
            ctx.fillText(Math.round(val), x + barWidth/2, y - 5);
        });
    },
    
    line(canvas, dataPoints) {
        this.resize(canvas);
        const ctx = canvas.getContext('2d');
        const padding = 40;
        const w = canvas.width - padding * 2;
        const h = canvas.height - padding * 2;
        const max = Math.max(...dataPoints) || 100;
        const min = Math.min(...dataPoints) || 0;
        const range = max - min || 1; // prevent divide by zero

        ctx.beginPath();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;

        dataPoints.forEach((val, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * w;
            const y = canvas.height - padding - ((val - min) / range) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
};