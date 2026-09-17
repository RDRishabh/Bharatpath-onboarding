import {
  CollegeStudent,
  InviteStudentRequest,
  StudentFilters,
  StudentListResponse,
} from "../types";

/*
 * Temporary static data.
 *
 * The backend API is not available yet, so the
 * roster is served from this mock until it is.
 */
const MOCK_STUDENTS: CollegeStudent[] = [
  {
    id: "stu-1",
    name: "Anjali Kulkarni",
    email: "anjali.k@svit.edu.in",
    course: "B.Sc Chemistry",
    year: "Final year",
    status: "linked",
    scoreBand: "strong",
    score: 82,
    lastActive: "2h ago",
  },
  {
    id: "stu-2",
    name: "Rohit Patil",
    email: "rohit.p@svit.edu.in",
    course: "B.E Mechanical",
    year: "Final year",
    status: "linked",
    scoreBand: "exceptional",
    score: 95,
    lastActive: "1d ago",
  },
  {
    id: "stu-3",
    name: "Sneha Deshmukh",
    email: "sneha.d@svit.edu.in",
    course: "B.Sc Chemistry",
    year: "Third year",
    status: "consent_pending",
    scoreBand: "building",
    score: 61,
    lastActive: "3d ago",
  },
  {
    id: "stu-4",
    name: "Nikhil Gaikwad",
    email: "nikhil.g@svit.edu.in",
    course: "Diploma Electrical",
    year: "Final year",
    status: "linked",
    scoreBand: "strong",
    score: 79,
    lastActive: "5h ago",
  },
  {
    id: "stu-5",
    name: "Vaishnavi Joshi",
    email: "vaishnavi.j@svit.edu.in",
    course: "B.E Production",
    year: "Third year",
    status: "invited",
    scoreBand: "not_scored",
    lastActive: "—",
  },
  {
    id: "stu-6",
    name: "Amit Deshpande",
    email: "amit.d@svit.edu.in",
    course: "B.E Computer",
    year: "Third year",
    status: "invited",
    scoreBand: "not_scored",
    lastActive: "—",
  },
  {
    id: "stu-7",
    name: "Pooja Sawant",
    email: "pooja.s@svit.edu.in",
    course: "B.Sc Physics",
    year: "Second year",
    status: "consent_pending",
    scoreBand: "building",
    score: 54,
    lastActive: "4d ago",
  },
];

function applyFilters(
  students: CollegeStudent[],
  filters: StudentFilters,
): CollegeStudent[] {
  return students.filter((student) => {
    if (
      filters.search &&
      !student.name
        .toLowerCase()
        .includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      student.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.course &&
      student.course !== filters.course
    ) {
      return false;
    }

    return true;
  });
}

export const studentsService = {
  async getStudents(
    filters: StudentFilters = {},
  ): Promise<StudentListResponse> {
    const filtered = applyFilters(
      MOCK_STUDENTS,
      filters,
    );

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const start = (page - 1) * pageSize;

    return {
      students: filtered.slice(
        start,
        start + pageSize,
      ),
      total: filtered.length,
      page,
      pageSize,
    };
  },

  async getStudent(
    id: string,
  ): Promise<CollegeStudent> {
    const student = MOCK_STUDENTS.find(
      (item) => item.id === id,
    );

    if (!student) {
      throw new Error("Student not found");
    }

    return student;
  },

  async inviteStudent(
    payload: InviteStudentRequest,
  ) {
    return {
      success: true,
      email: payload.email,
    };
  },

  async bulkUpload(
    file: File,
  ) {
    return {
      success: true,
      fileName: file.name,
    };
  },
};
