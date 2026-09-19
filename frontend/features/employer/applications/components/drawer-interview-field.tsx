interface InterviewFieldProps {
  meetingLink: string;
  onMeetingLinkChange: (value: string) => void;
}

export function InterviewField({
  meetingLink,
  onMeetingLinkChange,
}: InterviewFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#687384]">
        Meeting link
      </span>

      <input
        type="text"
        value={meetingLink}
        onChange={(event) => onMeetingLinkChange(event.target.value)}
        placeholder="https://meet.google.com/..."
        className="h-10 w-full rounded-lg border border-[#dfe3e9] bg-white px-3 text-[12px] text-[#151b2b] outline-none placeholder:text-[#a1a8b3] focus:border-[#315f9b] focus:ring-2 focus:ring-[#315f9b]/10"
      />
    </label>
  );
}
