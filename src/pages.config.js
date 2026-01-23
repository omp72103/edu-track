import AITimetableGenerator from './pages/AITimetableGenerator';
import AdvancedAnalysis from './pages/AdvancedAnalysis';
import Announcements from './pages/Announcements';
import Attendance from './pages/Attendance';
import BatchDetails from './pages/BatchDetails';
import BatchDetailsPage from './pages/BatchDetailsPage';
import Batches from './pages/Batches';
import ConsolidatedReport from './pages/ConsolidatedReport';
import CreateSession from './pages/CreateSession';
import Dashboard from './pages/Dashboard';
import ExcalidrawNotesList from './pages/ExcalidrawNotesList';
import ExcalidrawTeacher from './pages/ExcalidrawTeacher';
import ExcalidrawViewer from './pages/ExcalidrawViewer';
import FacultyReport from './pages/FacultyReport';
import GeoFenceManagement from './pages/GeoFenceManagement';
import Home from './pages/Home';
import ManageColleges from './pages/ManageColleges';
import ManageFaculty from './pages/ManageFaculty';
import ManageTimeTable from './pages/ManageTimeTable';
import Messages from './pages/Messages';
import Performance from './pages/Performance';
import ProxyDetection from './pages/ProxyDetection';
import QRAttendance from './pages/QRAttendance';
import QRAttendanceStudent from './pages/QRAttendanceStudent';
import StudentPerformance from './pages/StudentPerformance';
import StudentPortal from './pages/StudentPortal';
import TeachingNoteEditor from './pages/TeachingNoteEditor';
import TeachingNotes from './pages/TeachingNotes';
import TimeTable from './pages/TimeTable';
import Upload from './pages/Upload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AITimetableGenerator": AITimetableGenerator,
    "AdvancedAnalysis": AdvancedAnalysis,
    "Announcements": Announcements,
    "Attendance": Attendance,
    "BatchDetails": BatchDetails,
    "BatchDetailsPage": BatchDetailsPage,
    "Batches": Batches,
    "ConsolidatedReport": ConsolidatedReport,
    "CreateSession": CreateSession,
    "Dashboard": Dashboard,
    "ExcalidrawNotesList": ExcalidrawNotesList,
    "ExcalidrawTeacher": ExcalidrawTeacher,
    "ExcalidrawViewer": ExcalidrawViewer,
    "FacultyReport": FacultyReport,
    "GeoFenceManagement": GeoFenceManagement,
    "Home": Home,
    "ManageColleges": ManageColleges,
    "ManageFaculty": ManageFaculty,
    "ManageTimeTable": ManageTimeTable,
    "Messages": Messages,
    "Performance": Performance,
    "ProxyDetection": ProxyDetection,
    "QRAttendance": QRAttendance,
    "QRAttendanceStudent": QRAttendanceStudent,
    "StudentPerformance": StudentPerformance,
    "StudentPortal": StudentPortal,
    "TeachingNoteEditor": TeachingNoteEditor,
    "TeachingNotes": TeachingNotes,
    "TimeTable": TimeTable,
    "Upload": Upload,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};