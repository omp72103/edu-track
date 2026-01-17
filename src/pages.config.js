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
import ManageTimeTable from './pages/ManageTimeTable';
import StudentPerformance from './pages/StudentPerformance';
import TimeTable from './pages/TimeTable';
import Performance from './pages/Performance';
import Announcements from './pages/Announcements';
import Messages from './pages/Messages';
import AITimetableGenerator from './pages/AITimetableGenerator';
import StudentPortal from './pages/StudentPortal';
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
    "ManageTimeTable": ManageTimeTable,
    "StudentPerformance": StudentPerformance,
    "TimeTable": TimeTable,
    "Performance": Performance,
    "Announcements": Announcements,
    "Messages": Messages,
    "AITimetableGenerator": AITimetableGenerator,
    "StudentPortal": StudentPortal,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};