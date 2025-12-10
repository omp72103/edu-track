import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Attendance from './pages/Attendance';
import CreateSession from './pages/CreateSession';
import Batches from './pages/Batches';
import BatchDetails from './pages/BatchDetails';
import BatchDetailsPage from './pages/BatchDetailsPage';
import ManageColleges from './pages/ManageColleges';
import ManageFaculty from './pages/ManageFaculty';
import FacultyReport from './pages/FacultyReport';
import QRAttendance from './pages/QRAttendance';
import QRAttendanceStudent from './pages/QRAttendanceStudent';
import ConsolidatedReport from './pages/ConsolidatedReport';
import AdvancedAnalysis from './pages/AdvancedAnalysis';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Upload": Upload,
    "Attendance": Attendance,
    "CreateSession": CreateSession,
    "Batches": Batches,
    "BatchDetails": BatchDetails,
    "BatchDetailsPage": BatchDetailsPage,
    "ManageColleges": ManageColleges,
    "ManageFaculty": ManageFaculty,
    "FacultyReport": FacultyReport,
    "QRAttendance": QRAttendance,
    "QRAttendanceStudent": QRAttendanceStudent,
    "ConsolidatedReport": ConsolidatedReport,
    "AdvancedAnalysis": AdvancedAnalysis,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};