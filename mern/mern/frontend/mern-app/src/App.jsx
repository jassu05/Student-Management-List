import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const emptyForm = { name: "", email: "",course: "", age: 0 };

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  students: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  courses: <><path d="m2 7 10-5 10 5-10 5L2 7Z" /><path d="M6 9v6c3 3 9 3 12 0V9M22 7v6" /></>,
  reports: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.7Z" transform="translate(-1 -1)" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  retry: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" /></>,
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function getErrorMessage(error) {
  return error.response?.data?.error || error.message || "Something went wrong. Please try again.";
}


function App() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [duplicateNotice, setDuplicateNotice] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStudents() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await axios.get("/api/users", { signal: controller.signal });
        setStudents(response.data);
      } catch (error) {
        if (!axios.isCancel(error)) setLoadError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadStudents();
    return () => controller.abort();
  }, [reloadKey]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      `${student.name} ${student.email} ${student.course} ${student.age}`.toLowerCase().includes(query),
    );
  }, [search, students]);

  const recentCount = useMemo(() => {
    const currentMonth = new Date();
    return students.filter((student) => {
      if (!student.createdAt) return false;
      const created = new Date(student.createdAt);
      return created.getMonth() === currentMonth.getMonth()
        && created.getFullYear() === currentMonth.getFullYear();
    }).length;
  }, [students]);

  const openAddModal = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setActionError("");
    setDuplicateNotice("");
    setModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setForm({ name: student.name, email: student.email, course: student.course, age: student.age });
    setActionError("");
    setDuplicateNotice("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
    setEditingStudent(null);
    setForm(emptyForm);
    setActionError("");
  };

  const saveStudent = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");
    const studentData = { name: form.name.trim(), email: form.email.trim(), course: form.course.trim(), age: form.age };

    try {
      if (editingStudent) {
        const response = await axios.put(`/api/users/${editingStudent._id}`, studentData);
        setStudents((current) => current.map((student) =>
          student._id === editingStudent._id ? response.data : student,
        ));
      } else {
        const response = await axios.post("/api/users", studentData);
        setStudents((current) => current.some((student) => student._id === response.data._id)
          ? current.map((student) => student._id === response.data._id ? response.data : student)
          : [response.data, ...current]);
        if (response.status === 200) {
          setSearch("");
          setDuplicateNotice("The existing student record was updated and saved.");
        }
      }
      setModalOpen(false);
      setEditingStudent(null);
      setForm(emptyForm);
    } catch (error) {
      if (error.response?.status === 409) {
        setModalOpen(false);
        setEditingStudent(null);
        setForm(emptyForm);
        setSearch("");
        setDuplicateNotice("That email is already registered. Existing student records have been refreshed below.");
        setReloadKey((key) => key + 1);
      } else {
        setActionError(getErrorMessage(error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} from the student directory?`)) return;
    setDeletingId(student._id);
    setLoadError("");
    try {
      await axios.delete(`/api/users/${student._id}`);
      setStudents((current) => current.filter((item) => item._id !== student._id));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#main-content" aria-label="Student Portal home">
          

        </a>

        <div className="sidebar-label"></div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link" href="#overview"><Icon name="dashboard" /><span>Overview</span></a>
          <a className="nav-link active" href="#students" aria-current="page"><Icon name="students" /><span>Students</span><span className="nav-count">{students.length}</span></a>
          <a className="nav-link" href="#courses"><Icon name="courses" /><span>Courses</span><Icon name="chevron" size={15} /></a>
          <a className="nav-link" href="#reports"><Icon name="reports" /><span>Reports</span></a>
        </nav>

        <div className="sidebar-bottom">
          
          
        </div>
      </aside>

      <main className="main-panel" id="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Library</span><Icon name="chevron" size={14} /><strong>Students</strong></div>
          <div className="topbar-right">
            <span className="today-label">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>
            <button className="icon-button notification-button" type="button" aria-label="Notifications"><Icon name="bell" /><i /></button>
            <span className="topbar-divider" />
            <span className="topbar-user">Admin</span>
            <span className="user-avatar topbar-avatar">A</span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-banner" id="overview">
            <div className="welcome-copy">
              <h1>Student Portal</h1>
              <p>Manage student records.</p>
            </div>
            
          </section>

          <section className="stats-grid" aria-label="Student directory summary">
            <article className="stat-card">
              <span className="stat-icon blue-icon"><Icon name="students" size={20} /></span>
              <span className="stat-label">Total students</span>
              <strong className="stat-number">{students.length.toLocaleString()}</strong>
              <span className="stat-footnote">In your student directory</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon gold-icon"><Icon name="reports" size={20} /></span>
              <span className="stat-label">Added this month</span>
              <strong className="stat-number">{recentCount.toLocaleString()}</strong>
              <span className="stat-footnote">New student records</span>
            </article>
            <article className="stat-card sync-stat">
              <span className="stat-icon green-icon"><span className="sync-dot" /></span>
              <span className="stat-label">Directory status</span>
              <strong className="stat-number status-number">{loadError ? "Offline" : isLoading ? "Loading" : "Connected"}</strong>
              <span className="stat-footnote">{loadError ? "Check your API connection" : "Student records are up to date"}</span>
            </article>
          </section>

          <section className="directory-card" id="students">
            <div className="directory-heading">
              <div>
                <span className="section-kicker">STUDENT INFORMATION</span>
                <h2>All students <span className="heading-count">{students.length}</span></h2>
                <p>View and manage the students registered in your campus.</p>
              </div>
              <button className="primary-button" type="button" onClick={openAddModal}>
                <Icon name="plus" size={18} /><span>Add student</span>
              </button>
            </div>

            {loadError && (
              <div className="error-banner" role="alert">
                <span>{loadError}</span>
                <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
                  <Icon name="retry" size={16} /> Retry
                </button>
              </div>
            )}
            {duplicateNotice && <div className="error-banner" role="status">{duplicateNotice}</div>}

            <div className="table-toolbar">
              <label className="search-field">
                <Icon name="search" size={18} />
                <input
                  type="search"
                  placeholder="Search students..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search students by name or email"
                />
              </label>
              <span className="results-count">
                {search
                  ? `${filteredStudents.length} of ${students.length} students`
                  : `${students.length} ${students.length === 1 ? "record" : "records"}`}
              </span>
            </div>

            <div className="table-wrap">
              <table className="student-table">
                <thead>
                  <tr><th>STUDENT</th><th>COURSE</th><th>EMAIL ADDRESS</th><th>AGE</th><th aria-label="Actions" /></tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="5"><div className="table-message"><span className="loading-spinner" /> Loading student records...</div></td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div className="table-message empty-message">
                          <span className="empty-icon"><Icon name="students" size={24} /></span>
                          <strong>{search ? "No students found" : "Your Library is ready"}</strong>
                          <span>{search ? "Try a different name or email address." : "Add your first student to get started."}</span>
                          {!search && <button className="text-button" type="button" onClick={openAddModal}>Add a student</button>}
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.map((student, index) => (
                    <tr key={student._id}>
                      <td>
                        <div className="student-identity">
                          <span className={`student-avatar avatar-${index % 5}`}>{student.name?.trim().charAt(0).toUpperCase() || "S"}</span>
                          <span className="student-name">{student.name}</span>
                        </div>
                      </td>
                      <td><span className="student-course">{student.course}</span></td>
                      <td><a className="student-email" href={`mailto:${student.email}`}>{student.email}</a></td>
                      <td><span className="student-age">{student.age}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="row-action" type="button" aria-label={`Edit ${student.name}`} title="Edit student" onClick={() => openEditModal(student)}><Icon name="edit" size={17} /></button>
                          <button className="row-action delete-action" type="button" aria-label={`Delete ${student.name}`} title="Delete student" disabled={deletingId === student._id} onClick={() => deleteStudent(student)}><Icon name="trash" size={17} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="directory-footer">
              <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> student records</span>
              <span className="database-note"><span className="database-dot" /> Connected to MongoDB</span>
            </footer>
          </section>

          
        </div>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <span className="modal-icon"><Icon name={editingStudent ? "edit" : "students"} size={21} /></span>
              <button className="icon-button modal-close" type="button" aria-label="Close dialog" onClick={closeModal}><Icon name="close" /></button>
              <span className="section-kicker">{editingStudent ? "UPDATE RECORD" : "NEW RECORD"}</span>
              <h2 id="modal-title">{editingStudent ? "Edit student" : "Add a student"}</h2>
              <p>{editingStudent ? "Update this student's information below." : "Enter the student's details to add them to the directory."}</p>
            </div>
            <form className="student-form" onSubmit={saveStudent}>
              <label htmlFor="student-name">Full name</label>
              <input
                id="student-name"
                autoFocus
                required
                maxLength="100"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Alex Santos"
              />
              <label htmlFor="student-course">Course</label>
              <input
                id="student-course"
                autoFocus
                required
                maxLength="100"
                value={form.course}
                onChange={(event) => setForm((current) => ({ ...current, course: event.target.value }))}
                placeholder="e.g. BSIT"
              />
              <label htmlFor="student-email">Email address</label>
              <input
                id="student-email"
                type="email"
                required
                maxLength="254"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="student@university.edu"
              />
              <label htmlFor="student-age">Age</label>
              <input
                id="student-age"
                type="number"
                min="0"
                required
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: parseInt(event.target.value) || 0 }))}
              />
              {actionError && <div className="form-error" role="alert">{actionError}</div>}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeModal} disabled={isSaving}>Cancel</button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? <><span className="button-spinner" /> Saving...</> : editingStudent ? "Save changes" : "Add student"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
