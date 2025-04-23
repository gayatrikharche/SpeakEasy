import React, { useRef, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const spinnerStyle = {
  width: "30px",
  height: "30px",
  border: "4px solid #ccc",
  borderTop: "4px solid #6a1b9a",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto 1rem",
};

const spinnerKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

  const startRecording = async () => {
    console.log("Requesting microphone access...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        console.log("Audio chunk received");
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Recording stopped, preparing to send audio");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        console.log("Sending audio to backend...");

        setLoading(true);

        try {
          const res = await fetch("http://21b0-35-185-196-223.ngrok-free.app/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          console.log("Received response from backend:", data);

          const start = new Date(`${data.date}T${data.time}`);
          const end = new Date(start.getTime() + 30 * 60 * 1000);

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

        setLoading(false);
      };

      mediaRecorderRef.current.start();
      console.log("Recording started");
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  console.log("Rendering component - recording:", recording, "transcript:", transcript);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", background: "linear-gradient(to right, #e0f7fa, #e1bee7)", minHeight: "100vh" }}>
      <style>{spinnerKeyframes}</style>

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

      {loading && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={spinnerStyle}></div>
          <p style={{ fontStyle: "italic", color: "#6a1b9a", fontWeight: "bold" }}>
            Transcribing your input... please wait
          </p>
        </div>
      )}

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
