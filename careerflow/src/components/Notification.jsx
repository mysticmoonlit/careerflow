import React, { useEffect } from "react";

export default function Notification({ message, type = "success", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`notification-toast ${type}`}>
      <span className="notif-icon">
        {type === "success" ? "✓" : "⚠"}
      </span>
      <span className="notif-text">{message}</span>
      {onClose && (
        <button className="notif-close" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}
