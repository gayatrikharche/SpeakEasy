import React, { useRef, useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "5px solid #d1c4e9",
  borderTop: "5px solid #7e57c2",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 1rem",
};

const spinnerKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeInEvent {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .calendar-container {
    height: 400px !important;
    padding: 0.5rem !important;
  }
  .header-container {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.5rem !important;
  }
}`;

export default function VoiceScheduler() {
  const [events, setEvents] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const getIcon = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes("doctor") || lower.includes("appointment")) return "🩺";
    if (lower.includes("meeting")) return "📅";
    if (lower.includes("call")) return "📞";
    return "📝";
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("https://7580-34-125-16-213.ngrok-free.app/events");
        const data = await res.json();
        const parsedEvents = [];

        for (const [date, items] of Object.entries(data)) {
          for (const item of items) {
            const startString = `${date}T${item.time}`;
            const start = new Date(startString);
            const end = new Date(start.getTime() + 30 * 60 * 1000);

            if (!isNaN(start.getTime())) {
              parsedEvents.push({
                title: `${getIcon(item.purpose)} ${item.purpose} with ${item.person}`,
                start,
                end,
                className: "fade-in-event"
              });
            }
          }
        }

        setEvents(parsedEvents);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    fetchEvents();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        setLoading(true);

        try {
          const res = await fetch("https://7580-34-125-16-213.ngrok-free.app/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          const start = new Date(`${data.date}T${data.time}`);
          const end = new Date(start.getTime() + 30 * 60 * 1000);

          setEvents((prev) => [
            ...prev,
            {
              title: `${getIcon(data.purpose)} ${data.purpose} with ${data.person}`,
              start,
              end,
              className: "fade-in-event"
            },
          ]);

          setTranscript(data.transcript);
        } catch (err) {
          console.error("Error uploading audio:", err);
        }

        setLoading(false);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Poppins, sans-serif", background: "linear-gradient(to right, #5fb0a9, #b28bc4)" , minHeight: "100vh" }}>
      <style>{spinnerKeyframes}</style>

      <div className="header-container" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <img src="https://cdn-icons-png.flaticon.com/512/3405/3405822.png" alt="SpeakEasy Logo" width="40" height="40" />
        <h1 style={{ fontSize: "2.5rem", color: "black", margin: 0 }}>SpeakEasy</h1>
      </div>

      <p style={{ marginBottom: "2rem", fontSize: "1.1rem",  textAlign: "center", color: "#2c2c2c" }}>
        SpeakEasy is an AI-powered voice scheduler that lets you speak your appointments and see them automatically appear on your calendar using Whisper + LLaMA.
      </p>

      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          borderRadius: "30px",
          backgroundColor: recording ? "#e57373" : "#9575cd",
          color: "white",
          border: "none",
          cursor: "pointer",
          transition: "all 0.3s ease",
          marginBottom: "1.5rem",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        {recording ? "🛑 Stop Recording" : "🎙️ Start Speaking"}
      </button>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={spinnerStyle}></div>
          <p style={{ fontStyle: "italic", color: "#7e57c2", fontWeight: "bold" }}>
            Transcribing your input... please wait
          </p>
        </div>
      )}

      <p style={{ fontStyle: "italic", color: "#6d6875", marginBottom: "2rem" }}>
        {transcript && `You said: "${transcript}"`}
      </p>

      <div className="calendar-container" style={{ height: "500px", backgroundColor: "#fff0f6", borderRadius: "20px", padding: "1rem", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", color: "#3c096c" }}
          views={["month", "week", "day"]}
          view={view}
          onView={handleViewChange}
          date={date}
          onNavigate={handleNavigate}
          defaultView="month"
          toolbar={true}
        />
      </div>
    </div>
  );
}
