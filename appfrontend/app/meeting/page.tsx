"use client";

import { useEffect, useState } from "react";

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  participants: string;
  link: string | null; // null until started
  status: "scheduled" | "live" | "ended";
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [form, setForm] = useState<Omit<Meeting, "id" | "link" | "status">>({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "",
    participants: "",
  });

  // Auto start scheduled meetings at correct time
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setMeetings((prev) =>
        prev.map((m) => {
          const meetingDateTime = new Date(`${m.date}T${m.time}`);
          if (
            m.status === "scheduled" &&
            now >= meetingDateTime &&
            !m.link
          ) {
            return {
              ...m,
              status: "live",
              link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/meet/${m.id}`,
            };
          }
          return m;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Start Meeting Now
  const handleStartNow = () => {
    const id = crypto.randomUUID();
    const newMeeting: Meeting = {
      id,
      title: "Instant Meeting",
      description: "Quick meeting started instantly",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      duration: "Ongoing",
      participants: "Shared via link",
      link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/meet/${id}`,
      status: "live",
    };
    setMeetings((prev) => [...prev, newMeeting]);
  };

  // Schedule Meeting
  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    const newMeeting: Meeting = {
      id,
      ...form,
      link: null,
      status: "scheduled",
    };
    setMeetings((prev) => [...prev, newMeeting]);
    setForm({ title: "", description: "", date: "", time: "", duration: "", participants: "" });
  };

  const handleEnd = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "ended" } : m))
    );
  };

  const handleDelete = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 via-black to-gray-900 text-white p-6 font-poppins">
      <div className="w-full max-w-5xl bg-black/50 p-10 rounded-2xl shadow-2xl border border-white/10">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
          Meetings
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Start an instant meeting or schedule one
        </p>

        {/* Start Meeting Now */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleStartNow}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition font-semibold shadow-lg"
          >
            🚀 Start Meeting Now
          </button>
        </div>

        {/* Schedule Meeting Form */}
        <form onSubmit={handleSchedule} className="space-y-6 mb-10">
          <h3 className="text-xl font-semibold">📅 Schedule Meeting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Meeting Title"
              required
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
            <input
              type="text"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              placeholder="Duration (e.g. 1h)"
              required
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
          </div>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none resize-none h-20"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              required
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
          </div>

          <input
            type="text"
            name="participants"
            value={form.participants}
            onChange={handleChange}
            placeholder="Participants (comma separated emails)"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
          />

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition font-semibold shadow-lg"
          >
            Schedule Meeting
          </button>
        </form>

        {/* Meetings List */}
        <div>
          <h3 className="text-xl font-semibold mb-4">🗂 My Meetings</h3>
          {meetings.length === 0 ? (
            <p className="text-gray-400">No meetings yet.</p>
          ) : (
            <ul className="space-y-4">
              {meetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold">{meeting.title}</h4>
                      <p className="text-gray-400">{meeting.description}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {meeting.date} at {meeting.time} • {meeting.duration}
                      </p>
                      <p className="text-sm text-gray-500">
                        Participants: {meeting.participants}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status:{" "}
                        <span
                          className={
                            meeting.status === "live"
                              ? "text-green-400"
                              : meeting.status === "scheduled"
                              ? "text-yellow-400"
                              : "text-red-400"
                          }
                        >
                          {meeting.status}
                        </span>
                      </p>
                      {meeting.link && (
                        <p className="text-sm mt-2">
                          🔗{" "}
                          <a
                            href={meeting.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline"
                          >
                            Join Meeting
                          </a>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {meeting.status === "live" && (
                        <button
                          onClick={() => handleEnd(meeting.id)}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                        >
                          End
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(meeting.id)}
                        className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
