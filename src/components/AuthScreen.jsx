import { useState } from "react";
import { Icon } from "./Common";
import { signInWithPassword } from "../utils/supabase";

function getAuthErrorMessage(error) {
  const message = String(error?.message || "");

  if (message.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (message.includes("Email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  }
  if (message.includes("Password should be")) {
    return "Mật khẩu cần có ít nhất 6 ký tự.";
  }

  return message || "Không thể kết nối Supabase Auth.";
}

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAuth(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormValid = email.trim() && password.length >= 6;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon"><Icon name="logo" size={23} /></span>
          <div>
            <strong>KieuAssistant</strong>
            <span>Quản lý công việc nhập hàng</span>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">SUPABASE AUTH</p>
          <h1>Đăng nhập</h1>
          <p>Đăng nhập để truy cập dữ liệu KieuAssistant.</p>
        </div>

        <form className="auth-form" onSubmit={submitAuth}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input
              autoComplete="current-password"
              minLength="6"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              type="password"
              value={password}
            />
          </label>

          {errorMessage && <p className="auth-message auth-error">{errorMessage}</p>}

          <button
            className="primary-button auth-submit"
            disabled={!isFormValid || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
