import React, { useRef, useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "5px solid #ccc",
  borderTop: "5px solid #6a1b9a",
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
                title: `${item.purpose} with ${item.person}`,
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
              title: `${data.purpose} with ${data.person}`,
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
    <div style={{ padding: "2rem", fontFamily: "Poppins, sans-serif", background: "#1e1e2f", color: "#f0f0f0", minHeight: "100vh" }}>
      <style>{spinnerKeyframes}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <img src="https://cdn-icons-png.flaticon.com/512/3405/3405822.png" alt="SpeakEasy Logo" width="40" height="40" />
        <h1 style={{ fontSize: "2.5rem", color: "#bb86fc", margin: 0 }}>SpeakEasy</h1>
      </div>

      <p style={{ marginBottom: "2rem", fontSize: "1.1rem", color: "#ccc" }}>
        SpeakEasy is an AI-powered voice scheduler that lets you speak your appointments and see them automatically appear on your calendar using Whisper + LLaMA.
      </p>

      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          borderRadius: "30px",
          backgroundColor: recording ? "#cf6679" : "#bb86fc",
          color: "white",
          border: "none",
          cursor: "pointer",
          transition: "all 0.3s ease",
          marginBottom: "1.5rem",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.4)",
        }}
      >
        {recording ? "🛑 Stop Recording" : "🎙️ Start Speaking"}
      </button>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={spinnerStyle}></div>
          <p style={{ fontStyle: "italic", color: "#bb86fc", fontWeight: "bold" }}>
            Transcribing your input... please wait
          </p>
        </div>
      )}

      <p style={{ fontStyle: "italic", color: "#9e9e9e", marginBottom: "2rem" }}>
        {transcript && `You said: "${transcript}"`}
      </p>

      <div style={{ height: "500px", backgroundColor: "#2e2e3e", borderRadius: "20px", padding: "1rem", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", color: "#fff" }}
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
