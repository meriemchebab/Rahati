"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  RefreshCw,
  Plus,
  Check,
  Trash2,
  Pencil,
  X,
  ClipboardList,
  CalendarDays,
} from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getPatients,
  getPatientTodos,
  createPatientTodo,
  updatePatientTodo,
  deletePatientTodo,
  type ProfessionalPatient,
  type PatientTodo,
} from "@/lib/professional-api";

type PatientWithTodos = ProfessionalPatient & {
  actions: PatientTodo[];
  actionsLoading: boolean;
};

const emptyForm = {
  title: "",
  description: "",
  due_date: "",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithTodos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PatientTodo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const data = await getPatients();

      setPatients(
        data.map((patient) => ({
          ...patient,
          actions: [],
          actionsLoading: false,
        })),
      );

      if (data.length > 0) {
        setSelectedPatient((current) =>
          current && data.some((patient) => patient.id === current)
            ? current
            : data[0].id,
        );
      } else {
        setSelectedPatient(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load patients.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadTodos = useCallback(async (patientId: number) => {
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId
          ? { ...patient, actionsLoading: true }
          : patient,
      ),
    );

    try {
      const actions = await getPatientTodos(patientId);

      setPatients((current) =>
        current.map((patient) =>
          patient.id === patientId
            ? { ...patient, actions, actionsLoading: false }
            : patient,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load assigned actions.",
      );

      setPatients((current) =>
        current.map((patient) =>
          patient.id === patientId
            ? { ...patient, actionsLoading: false }
            : patient,
        ),
      );
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatient !== null) {
      void loadTodos(selectedPatient);
    }
  }, [selectedPatient, loadTodos]);

  const activePatient = patients.find(
    (patient) => patient.id === selectedPatient,
  );

  function openCreateForm() {
    setEditingTodo(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(todo: PatientTodo) {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description ?? "",
      due_date: todo.due_date ?? "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function saveTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPatient || !form.title.trim()) {
      setError("Please enter an action title.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.due_date || null,
    };

    try {
      if (editingTodo) {
        await updatePatientTodo(selectedPatient, editingTodo.id, payload);
        setSuccess("The action has been updated.");
      } else {
        await createPatientTodo(selectedPatient, payload);
        setSuccess("The action has been assigned.");
      }

      setShowForm(false);
      setEditingTodo(null);
      setForm(emptyForm);

      await Promise.all([loadTodos(selectedPatient), loadPatients(true)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save this action.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTodo(todo: PatientTodo) {
    if (!selectedPatient) return;

    const completed = Boolean(todo.is_completed ?? todo.completed);

    setError("");
    setSuccess("");

    try {
      await updatePatientTodo(selectedPatient, todo.id, {
        is_completed: !completed,
        completed: !completed,
        done_at: !completed ? new Date().toISOString() : null,
      });

      await loadTodos(selectedPatient);
      await loadPatients(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update this action.",
      );
    }
  }

  async function removeTodo(todoId: number) {
    if (!selectedPatient) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this assigned action?",
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deletePatientTodo(selectedPatient, todoId);
      setSuccess("The action has been deleted.");

      await Promise.all([loadTodos(selectedPatient), loadPatients(true)]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete this action.",
      );
    }
  }

  const completedCount =
    activePatient?.actions.filter((todo) =>
      Boolean(todo.is_completed ?? todo.completed),
    ).length ?? 0;

  const totalCount = activePatient?.actions.length ?? 0;

  return (
    <DashboardLayout selectedPage="Patients">
      <main className="min-h-screen bg-[#f7f0f5] px-4 py-6 sm:px-7 lg:px-9">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a17c99]">
                Your practice
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#67465d]">
                Your patients
              </h1>
              <p className="mt-2 text-sm text-[#927d8d]">
                Manage your connected patients and their assigned actions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPatients(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#76556e] shadow-sm transition hover:bg-[#fbf5fa] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </header>

          {error && (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl bg-[#faeaea] px-4 py-3 text-sm text-[#a34f4f]">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl bg-[#e8f2e8] px-4 py-3 text-sm text-[#55785b]">
              {success}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-2xl bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1e7f0] text-[#896987]">
                  <Users size={19} />
                </div>
                <p className="text-sm text-[#927d8d]">Connected patients</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#67465d]">
                {patients.length}
              </p>
            </article>

            <article className="rounded-2xl bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4df] text-[#9b7431]">
                  <ClipboardList size={19} />
                </div>
                <p className="text-sm text-[#927d8d]">Open actions</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#67465d]">
                {patients.reduce((sum, patient) => sum + patient.todos.open, 0)}
              </p>
            </article>

            <article className="rounded-2xl bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f2e8] text-[#66876d]">
                  <Check size={19} />
                </div>
                <p className="text-sm text-[#927d8d]">Completed actions</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#67465d]">
                {patients.reduce((sum, patient) => sum + patient.todos.done, 0)}
              </p>
            </article>
          </section>

          {loading ? (
            <div className="rounded-2xl bg-white/90 px-6 py-20 text-center text-sm text-[#927d8d] shadow-sm">
              Loading your patients…
            </div>
          ) : patients.length === 0 ? (
            <div className="rounded-2xl bg-white/90 px-6 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f1e7f0] text-[#896987]">
                <Users size={22} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[#67465d]">
                No connected patients yet
              </h2>
              <p className="mt-2 text-sm text-[#927d8d]">
                Patients will appear here when they have an accepted or
                completed session with you.
              </p>
            </div>
          ) : (
            <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
              <aside className="rounded-2xl bg-white/90 p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 px-1 text-base font-semibold text-[#67465d]">
                  Patient list
                </h2>

                <div className="space-y-2">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(patient.id);
                        setShowForm(false);
                        setError("");
                        setSuccess("");
                      }}
                      className={`w-full rounded-xl p-4 text-left transition ${
                        selectedPatient === patient.id
                          ? "bg-[#f1e7f0] ring-1 ring-[#dfcddd]"
                          : "bg-[#faf6f9] hover:bg-[#f5edf4]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8dce7] text-sm font-semibold text-[#80647e]">
                          {patient.nickname.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#67465d]">
                            {patient.nickname}
                          </p>
                          <p className="mt-1 text-[11px] text-[#927d8d]">
                            Patient #{patient.id}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[#80647e]">
                          {patient.todos.open} open
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[#66876d]">
                          {patient.todos.done} done
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="min-w-0 rounded-2xl bg-white/90 p-4 shadow-sm sm:p-6">
                {activePatient ? (
                  <>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a17c99]">
                          Patient overview
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[#67465d]">
                          {activePatient.nickname}
                        </h2>
                        <p className="mt-1 text-xs text-[#927d8d]">
                          Patient #{activePatient.id}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8d6b88] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#785775]"
                      >
                        <Plus size={15} />
                        Assign an action
                      </button>
                    </div>

                    <div className="mt-5 rounded-xl bg-[#faf6f9] p-4">
                      <p className="text-xs font-medium text-[#927d8d]">
                        Shared information
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {activePatient.shared.length > 0 ? (
                          activePatient.shared.map((item) => (
                            <span
                              key={item}
                              className="rounded-full bg-[#eee4ed] px-3 py-1.5 text-xs font-medium capitalize text-[#80647e]"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#927d8d]">
                            No categories are currently shared.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[#67465d]">
                            Assigned actions
                          </h3>
                          <p className="mt-1 text-xs text-[#927d8d]">
                            Actions assigned to this patient.
                          </p>
                        </div>

                        <span className="rounded-full bg-[#f1e7f0] px-3 py-1.5 text-xs font-medium text-[#80647e]">
                          {completedCount} / {totalCount} completed
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0e6ef]">
                        <div
                          className="h-full rounded-full bg-[#91aa96] transition-all"
                          style={{
                            width: `${
                              totalCount > 0
                                ? (completedCount / totalCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      {activePatient.actionsLoading ? (
                        <p className="py-12 text-center text-sm text-[#927d8d]">
                          Loading assigned actions…
                        </p>
                      ) : activePatient.actions.length === 0 ? (
                        <div className="mt-5 rounded-xl bg-[#faf6f9] px-5 py-12 text-center">
                          <ClipboardList
                            size={23}
                            className="mx-auto text-[#a17c99]"
                          />
                          <p className="mt-3 text-sm font-semibold text-[#67465d]">
                            No assigned actions yet
                          </p>
                          <p className="mt-1 text-xs text-[#927d8d]">
                            Create an action to help this patient follow their
                            progress.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {activePatient.actions.map((todo) => {
                            const isCompleted = Boolean(
                              todo.is_completed ?? todo.completed,
                            );

                            return (
                              <article
                                key={todo.id}
                                className="flex flex-col justify-between gap-3 rounded-xl bg-[#faf6f9] p-4 sm:flex-row sm:items-center"
                              >
                                <div className="flex min-w-0 items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() => void toggleTodo(todo)}
                                    aria-label={
                                      isCompleted
                                        ? "Mark as incomplete"
                                        : "Mark as complete"
                                    }
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                      isCompleted
                                        ? "border-[#78947d] bg-[#78947d] text-white"
                                        : "border-[#cbb8c9] bg-white text-transparent hover:border-[#78947d]"
                                    }`}
                                  >
                                    <Check size={13} />
                                  </button>

                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-semibold ${
                                        isCompleted
                                          ? "text-[#9a8997] line-through"
                                          : "text-[#67465d]"
                                      }`}
                                    >
                                      {todo.title}
                                    </p>

                                    {todo.description && (
                                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[#927d8d]">
                                        {todo.description}
                                      </p>
                                    )}

                                    {todo.due_date && (
                                      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#927d8d]">
                                        <CalendarDays size={12} />
                                        Due{" "}
                                        {new Date(
                                          `${todo.due_date}T00:00:00`,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => openEditForm(todo)}
                                    aria-label="Edit action"
                                    className="rounded-lg p-2 text-[#80647e] transition hover:bg-[#eee4ed]"
                                  >
                                    <Pencil size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void removeTodo(todo.id)}
                                    aria-label="Delete action"
                                    className="rounded-lg p-2 text-[#ad6969] transition hover:bg-[#faeaea]"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-sm text-[#927d8d]">
                    Select a patient to view their information.
                  </div>
                )}
              </section>
            </section>
          )}

          {showForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#3f2d3d]/35 p-4 backdrop-blur-sm">
              <form
                onSubmit={saveTodo}
                className="w-full max-w-lg rounded-2xl bg-[#fffafd] p-6 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#67465d]">
                      {editingTodo
                        ? "Edit assigned action"
                        : "Assign an action"}
                    </h2>
                    <p className="mt-1 text-xs text-[#927d8d]">
                      {activePatient?.nickname}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-2 text-[#80647e] hover:bg-[#f1e7f0]"
                    aria-label="Close form"
                  >
                    <X size={18} />
                  </button>
                </div>

                <label className="mt-6 block text-xs font-semibold text-[#76556e]">
                  Action title
                </label>
                <input
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="For example: Complete the weekly reflection"
                  className="mt-2 w-full rounded-xl border border-[#e8dce7] bg-white px-4 py-3 text-sm text-[#67465d] outline-none transition placeholder:text-[#b7a5b5] focus:border-[#a17c99]"
                />

                <label className="mt-4 block text-xs font-semibold text-[#76556e]">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add instructions or details…"
                  className="mt-2 w-full resize-none rounded-xl border border-[#e8dce7] bg-white px-4 py-3 text-sm text-[#67465d] outline-none transition placeholder:text-[#b7a5b5] focus:border-[#a17c99]"
                />

                <label className="mt-4 block text-xs font-semibold text-[#76556e]">
                  Due date
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      due_date: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[#e8dce7] bg-white px-4 py-3 text-sm text-[#67465d] outline-none focus:border-[#a17c99]"
                />

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#80647e] hover:bg-[#f1e7f0]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#8d6b88] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#785775] disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : editingTodo
                        ? "Save changes"
                        : "Assign action"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
