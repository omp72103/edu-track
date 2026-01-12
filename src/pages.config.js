import AdvancedAnalysis from './pages/AdvancedAnalysis';
import Attendance from './pages/Attendance';
import BatchDetails from './pages/BatchDetails';
import BatchDetailsPage from './pages/BatchDetailsPage';
import Batches from './pages/Batches';
import ConsolidatedReport from './pages/ConsolidatedReport';
import CreateSession from './pages/CreateSession';
import Dashboard from './pages/Dashboard';
import FacultyReport from './pages/FacultyReport';
import Home from './pages/Home';
import ManageColleges from './pages/ManageColleges';
import ManageFaculty from './pages/ManageFaculty';
import QRAttendance from './pages/QRAttendance';
import QRAttendanceStudent from './pages/QRAttendanceStudent';
import Upload from './pages/Upload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdvancedAnalysis": AdvancedAnalysis,
    "Attendance": Attendance,
    "BatchDetails": BatchDetails,
    "BatchDetailsPage": BatchDetailsPage,
    "Batches": Batches,
    "ConsolidatedReport": ConsolidatedReport,
    "CreateSession": CreateSession,
    "Dashboard": Dashboard,
    "FacultyReport": FacultyReport,
    "Home": Home,
    "ManageColleges": ManageColleges,
    "ManageFaculty": ManageFaculty,
    "QRAttendance": QRAttendance,
    "QRAttendanceStudent": QRAttendanceStudent,
    "Upload": Upload,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};