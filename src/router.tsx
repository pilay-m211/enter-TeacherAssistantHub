import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClassDetail from "./pages/ClassDetail";
import AssignmentGrading from "./pages/AssignmentGrading";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Landing />,
  },
  {
    path: "/auth",
    name: "auth",
    element: <Auth />,
  },
  {
    path: "/app",
    name: "app",
    element: <ProtectedRoute />,
    children: [
      {
        path: "",
        element: <AppLayout />,
        children: [
          { index: true, name: "dashboard", element: <Dashboard /> },
          { path: "classes/:classId", name: "class-detail", element: <ClassDetail /> },
          {
            path: "classes/:classId/assignments/:assignmentId",
            name: "assignment-grading",
            element: <AssignmentGrading />,
          },
        ],
      },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
