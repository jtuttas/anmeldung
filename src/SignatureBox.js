import React, { useRef } from 'react';
import './Anmeldeformular.css';

const SignatureBox = React.forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  React.useImperativeHandle(ref, () => ({
    clear: () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    },
    isEmpty: () => {
      const ctx = canvasRef.current.getContext('2d');
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data.buffer
      );
      return !pixelBuffer.some(color => color !== 0);
    },
    getDataURL: () => canvasRef.current.toDataURL('image/png'),
  }));

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let last = { x: 0, y: 0 };
    let isDrawing = false;
    let hasDrawn = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    };

    const start = (e) => {
      e.preventDefault();
      isDrawing = true;
      last = getPos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
    };
    const draw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      last = pos;
      hasDrawn = true;
    };
    const end = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      ctx.closePath();
      // Fix: force a redraw if nothing was drawn (workaround for some browsers)
      if (!hasDrawn) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 0.1);
        ctx.stroke();
        ctx.closePath();
      }
      hasDrawn = false;
    };

    // Remove before adding to avoid duplicate listeners
    canvas.removeEventListener('mousedown', start);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', end);
    canvas.removeEventListener('mouseleave', end);
    canvas.removeEventListener('touchstart', start);
    canvas.removeEventListener('touchmove', draw);
    canvas.removeEventListener('touchend', end);
    canvas.removeEventListener('touchcancel', end);

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', end);
      canvas.removeEventListener('touchcancel', end);
    };
  }, []);

  return (
    <div style={{width: 350, height: 100, maxWidth: '100%'}}>
      <canvas
        ref={canvasRef}
        width={350}
        height={100}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          display: 'block',
          background: '#fff',
        }}
      />
    </div>
  );
});

export default SignatureBox;
