import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGradeBook } from "@/hooks/useGradeBook";
import { SUBJECT_GROUP_LABELS, TERMS, TERM_LABELS, type SubjectGroup } from "@/lib/gradingConfig";

const ReportCardPrint = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classItem, yearSummary, loading } = useGradeBook(classId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const className = classItem?.name ?? "Class";
  const subjectGroup = (classItem?.subject_group as SubjectGroup) ?? "core";

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-card-page {
            page-break-after: always;
            break-after: page;
          }
          .report-card-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <Link
          to={`/app/classes/${classId}/gradebook`}
          className="inline-flex items-center gap-1 text-sm text-neutral-600 transition-colors hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Grade Book
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {yearSummary.length === 0 ? (
          <p className="text-center text-neutral-500">No students in this class yet.</p>
        ) : (
          yearSummary.map((student) => (
            <div key={student.studentId} className="report-card-page mb-12 border border-neutral-300 p-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Republic of the Philippines</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Department of Education</p>
                <h1 className="mt-2 text-lg font-bold uppercase">Report Card</h1>
                <p className="text-xs text-neutral-500">(Form 138)</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-y-2 border-y border-neutral-300 py-4 text-sm">
                <div>
                  <span className="font-semibold">Learner's Name:</span> {student.studentName}
                </div>
                <div>
                  <span className="font-semibold">Learning Area / Class:</span> {className}
                </div>
                <div>
                  <span className="font-semibold">Subject Group:</span> {SUBJECT_GROUP_LABELS[subjectGroup]}
                </div>
              </div>

              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr className="border border-neutral-400 bg-neutral-100">
                    <th className="border border-neutral-400 px-3 py-2 text-left">Term</th>
                    {TERMS.map((t) => (
                      <th key={t} className="border border-neutral-400 px-3 py-2 text-left">{TERM_LABELS[t]}</th>
                    ))}
                    <th className="border border-neutral-400 px-3 py-2 text-left">Final Grade</th>
                    <th className="border border-neutral-400 px-3 py-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-neutral-400 px-3 py-2 font-medium">{className}</td>
                    {student.termGrades.map((grade, index) => (
                      <td key={index} className="border border-neutral-400 px-3 py-2 text-center">
                        {grade ?? "—"}
                      </td>
                    ))}
                    <td className="border border-neutral-400 px-3 py-2 text-center font-semibold">
                      {student.finalGrade ?? "—"}
                    </td>
                    <td className="border border-neutral-400 px-3 py-2 text-center">{student.remarks}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
                <div className="text-center">
                  <div className="border-t border-neutral-400 pt-1">Subject Teacher</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-neutral-400 pt-1">Class Adviser</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportCardPrint;
