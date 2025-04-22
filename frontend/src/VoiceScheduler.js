import React, { useRef, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function VoiceScheduler() {
  const [events, setEvents] = useState([]);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  const startRecording = async () => {
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
    
      try {
        const res = await fetch("http://localhost:3000/transcribe", {
          method: "POST",
          body: formData,
        });
    
        const data = await res.json();
    
        const start = new Date(`${data.date}T${data.time}`);
        const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes
    
        setEvents((prev) => [
          ...prev,
          {
            title: `${data.purpose} with ${data.person}`,
            start,
            end,
          },
        ]);
    
        setTranscript(data.transcript);
      } catch (err) {
        console.error("Error uploading audio:", err);
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", background: "linear-gradient(to right, #e0f7fa, #e1bee7)", minHeight: "100vh" }}>
      <h2 style={{ fontSize: "2rem", color: "#6a1b9a", marginBottom: "1rem" }}>🎤 Voice Scheduler</h2>

      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          borderRadius: "30px",
          backgroundColor: recording ? "#d32f2f" : "#7b1fa2",
          color: "white",
          border: "none",
          cursor: "pointer",
          transition: "0.3s ease",
          marginBottom: "1rem",
        }}
      >
        {recording ? "🛑 Stop Recording" : "🎙️ Start Speaking"}
      </button>

      <p style={{ fontStyle: "italic", color: "#4a148c", marginBottom: "2rem" }}>
        {transcript && `You said: "${transcript}"`}
      </p>

      <div style={{ height: "500px", backgroundColor: "white", borderRadius: "20px", padding: "1rem", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day"]}
          defaultView="month"
          toolbar={true}
        />
      </div>
    </div>
  );
}
