import React, { useState } from "react";

export default function DatePicker({ label, value, onChange, min, max, className }) {
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange && onChange(e.target.value);
  };

  return (
    <div className={"relative " + (className || "")}> 
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <input
        type="date"
        value={inputValue}
        onChange={handleInputChange}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
