import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";
import { AuthProvider } from "./state/AuthContext";
import { ThemeProvider } from "./state/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
