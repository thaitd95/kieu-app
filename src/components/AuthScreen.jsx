import { useState } from "react";
import { Icon } from "./Common";
import { signInWithPassword, signUpWithPassword } from "../utils/supabase";

function getAuthErrorMessage(error) {
  const message = String(error?.message || "");

  if (message.includes("Invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (message.includes("Email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  }
  if (message.includes("User already registered")) {
    return "Email này đã được đăng ký.";
  }
  if (message.includes("Password should be")) {
    return "Mật khẩu cần có ít nhất 6 ký tự.";
  }

  return message || "Không thể kết nối Supabase Auth.";
}

export default function AuthScreen() {
  const [mode, setMode] = useState("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setErrorMessage("");
    setNotice("");
  }

  async function submitAuth(event) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { session } = await signUpWithPassword({ email, fullName, password });
        if (!session) {
          setNotice("Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận đăng ký.");
        }
      } else {
        await signInWithPassword(email, password);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSignUp = mode === "sign-up";
  const isFormValid =
    email.trim() &&
    password.length >= 6 &&
    (!isSignUp || fullName.trim());

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
          <h1>{isSignUp ? "Tạo tài khoản" : "Đăng nhập"}</h1>
          <p>
            {isSignUp
              ? "Tạo tài khoản để bắt đầu workspace của bạn."
              : "Đăng nhập để truy cập dữ liệu KieuAssistant."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={!isSignUp ? "active" : ""}
            onClick={() => changeMode("sign-in")}
            type="button"
          >
            Đăng nhập
          </button>
          <button
            className={isSignUp ? "active" : ""}
            onClick={() => changeMode("sign-up")}
            type="button"
          >
            Đăng ký
          </button>
        </div>

        <form className="auth-form" onSubmit={submitAuth}>
          {isSignUp && (
            <label>
              <span>Họ và tên</span>
              <input
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Mỹ Kiều"
                type="text"
                value={fullName}
              />
            </label>
          )}
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
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength="6"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              type="password"
              value={password}
            />
          </label>

          {errorMessage && <p className="auth-message auth-error">{errorMessage}</p>}
          {notice && <p className="auth-message auth-notice">{notice}</p>}

          <button
            className="primary-button auth-submit"
            disabled={!isFormValid || isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Đang xử lý..."
              : isSignUp
                ? "Tạo tài khoản"
                : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
