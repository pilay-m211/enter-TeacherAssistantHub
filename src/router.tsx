import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import AssignmentGrading from "./pages/AssignmentGrading";
import GradeBook from "./pages/GradeBook";
import ReportCardPrint from "./pages/ReportCardPrint";
import Students from "./pages/Students";
import Scanner from "./pages/Scanner";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
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
          { path: "classes", name: "classes", element: <Classes /> },
          { path: "classes/:classId", name: "class-detail", element: <ClassDetail /> },
          {
            path: "classes/:classId/assignments/:assignmentId",
            name: "assignment-grading",
            element: <AssignmentGrading />,
          },
          { path: "classes/:classId/gradebook", name: "gradebook", element: <GradeBook /> },
          { path: "students", name: "students", element: <Students /> },
          { path: "scanner", name: "scanner", element: <Scanner /> },
          { path: "reports", name: "reports", element: <Reports /> },
          { path: "settings", name: "settings", element: <Settings /> },
        ],
      },
      /* Print-only route: intentionally outside AppLayout so no sidebar/topbar renders. */
      {
        path: "classes/:classId/report-card",
        name: "report-card-print",
        element: <ReportCardPrint />,
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
