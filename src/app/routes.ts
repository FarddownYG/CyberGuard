import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { PentestingPage } from "./components/PentestingPage";
import { VirusTotalPage } from "./components/VirusTotalPage";
import { SSLCheckerPage } from "./components/SSLCheckerPage";
import { BlogPage } from "./components/BlogPage";
import { AboutPage } from "./components/AboutPage";
import { ToolsPage } from "./components/ToolsPage";
import { PasswordGenerator } from "./components/PasswordGenerator";
import { FileAnalyzer } from "./components/FileAnalyzer";
import { EmailChecker } from "./components/EmailChecker";
import { DNSChecker } from "./components/DNSChecker";
import { StatusPage } from "./components/StatusPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "pentesting", Component: PentestingPage },
      { path: "virustotal", Component: VirusTotalPage },
      { path: "ssl-checker", Component: SSLCheckerPage },
      { path: "blog", Component: BlogPage },
      { path: "about", Component: AboutPage },
      { path: "tools", Component: ToolsPage },
      { path: "tools/password", Component: PasswordGenerator },
      { path: "tools/file-analyzer", Component: FileAnalyzer },
      { path: "tools/email-checker", Component: EmailChecker },
      { path: "tools/dns-checker", Component: DNSChecker },
      { path: "status", Component: StatusPage },
      { path: "*", Component: HomePage },
    ],
  },
]);
