function Input({ value, setValue, onSend, loading }) {
  return (
    <div className="input-area">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        placeholder="Escribe un partido..."
      />
      <button onClick={onSend} disabled={loading}>
        Send
      </button>
    </div>
  );
}

export default Input;
