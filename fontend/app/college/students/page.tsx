import { studentsService } from "@/features/college/students/services/students.service";
import { StudentRoster } from "@/features/college/students/components/student-roster";

export default async function StudentsPage() {
  const response =
    await studentsService.getStudents({
      page: 1,
      pageSize: 50,
    });

  return (
    <StudentRoster
      students={response.students}
      total={response.total}
    />
  );
}