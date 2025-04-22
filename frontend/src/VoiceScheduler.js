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

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      // Simulate backend response for now
      const data = {
        person: "Dr. Meera",
        date: "2025-04-22",
        time: "14:30",
        purpose: "appointment",
        transcript: "Schedule an appointment with Dr. Meera next Tuesday at 2:30 PM",
      };

      const start = new Date(`${data.date}T${data.time}`);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins

      setEvents((prev) => [
        ...prev,
        {
          title: `${data.purpose} with ${data.person}`,
          start,
          end,
        },
      ]);

      setTranscript(data.transcript);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎤 Voice Scheduler</h2>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "🛑 Stop Recording" : "🎙️ Start Speaking"}
      </button>
      <p>{transcript && `You said: "${transcript}"`}</p>

      <div style={{ height: "500px", marginTop: "2rem" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
