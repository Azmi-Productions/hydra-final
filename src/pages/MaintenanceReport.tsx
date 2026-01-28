import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";

// --- Types ---
export interface ReportData {
  id: number;
  activity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string; // "ALAMAT"
  photos: string[]; // Array of photo URLs
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REPORT_TABLE = "reports";

// Updated captions for 19 categories
const CAPTIONS = [
    "wakil syabas di tapak",
    "penyediaan peralatan keselamatan",
    "lokasi kebocoran",
    "kerja-kerja pemotongan jalan",
    "kerja-kerja pengorekan",
    "kerja-kerja pembaikan",
    "barangan rosak/lama",
    "barangan yang akan diganti",
    "kerja memasukkan pasir",
    "kerja-kerja mampatan pasir lapisan pertama",
    "kerja-kerja mampatan batu pecah",
    "kerja-kerja pembaikan",
    "kerja telah siap sepenuhnya",
    "Gambar papan putih",
    "gambar pengesahan tapak",
    "Gambar point bocor untuk kerja pembaikan",
    "gambar point bocor yang telah pembaikan",
    "gambara barang lama yang telah rosak",
    "gambar barang baru yang telah ditukar"
];

// Helper to safely get photo or placeholder
const getPhoto = (photos: string[] | undefined, index: number) => {
    if (photos && photos[index]) return photos[index];
    return null;
};

// Formatting date for display: YYYY-MM-DD -> DD.MM.YYYY
const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split('-'); // Assuming YYYY-MM-DD
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateString;
};

export const MaintenanceReportTemplate = ({ data }: { data: ReportData }) => {
    return (
        <div className="bg-white w-[210mm] min-h-[297mm] shadow-xl print:shadow-none p-8 border border-gray-300 print:border-none flex flex-col mx-auto">
        
        {/* Header */}
        <div className="text-center font-bold border border-black p-1 bg-white uppercase text-sm mb-0.5">
          KERJA-KERJA PENYELENGGARAAN PAIP MUKA SURAT 1
        </div>

        {/* Info Table */}
        <div className="border border-black text-sm mb-0.5">
            <div className="grid grid-cols-[150px_1fr] border-b border-black last:border-b-0">
                <div className="p-1 font-bold border-r border-black uppercase text-xs sm:text-sm pl-2">NO PUSPEL</div>
                <div className="p-1 pl-2 font-medium">{data.activity_id}</div>
            </div>
            <div className="grid grid-cols-[150px_1fr] border-b border-black last:border-b-0">
                <div className="p-1 font-bold border-r border-black uppercase text-xs sm:text-sm pl-2">TARIKH</div>
                <div className="p-1 pl-2 font-medium">{formatDate(data.date)}</div>
            </div>
            <div className="grid grid-cols-[150px_1fr] border-b border-black last:border-b-0">
                <div className="p-1 font-bold border-r border-black uppercase text-xs sm:text-sm pl-2">MASA</div>
                <div className="p-1 pl-2 font-medium">{data.start_time} - {data.end_time}</div>
            </div>
            <div className="grid grid-cols-[150px_1fr]">
                <div className="p-1 font-bold border-r border-black uppercase text-xs sm:text-sm pl-2">ALAMAT</div>
                <div className="p-1 pl-2 font-medium uppercase">{data.address}</div>
            </div>
        </div>

        {/* Photo Grid */}
        <div className="border border-black flex-1 w-full mt-0.5">
            <div className="grid grid-cols-2 h-full">
                {/* 4 Rows, 2 Columns -> 8 Cells */}
                {Array.from({ length: 8 }).map((_, index) => {
                    const photoUrl = getPhoto(data.photos, index);
                    const caption = CAPTIONS[index] || "";
                    
                    // Borders:
                    // Right border for all left columns (even index)
                    // Bottom border for all except last row (indices 6, 7)
                    const isLeftCol = index % 2 === 0;
                    const isLastRow = index >= 6;
                    
                    const borderClasses = `
                        ${isLeftCol ? 'border-r border-black' : ''}
                        ${!isLastRow ? 'border-b border-black' : ''}
                    `;

                    return (
                        <div key={index} className={`flex flex-col h-[280px] ${borderClasses}`}>
                             {/* Image Area - Flex grow to fill space */}
                             <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-gray-50 print:bg-white relative">
                                {photoUrl ? (
                                    <img 
                                        src={photoUrl} 
                                        alt={caption} 
                                        className="w-full h-full object-cover border border-gray-200"
                                    />
                                ) : (
                                    <div className="text-gray-300 italic text-xs">No Image</div>
                                )}
                             </div>
                             
                             {/* Caption Area - Fixed height at bottom */}
                             <div className="text-center border-t border-black p-1 text-xs uppercase font-bold bg-white">
                                {caption}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>
    );
};

export default function MaintenanceReport() {
  const { id } = useParams();
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const placeholderData: ReportData = {
    id: 0,
    activity_id: "09232858",
    date: "30.11.2025",
    start_time: "9.40",
    end_time: "12.32",
    address: "132, JLN BRP 5/3 BUKIT RAHMAN PUTRA SUNGAI BULOH SELANGOR",
    photos: []
  };

  useEffect(() => {
    if (!id) {
       setReport(placeholderData);
       setLoading(false);
       return;
    }

    const fetchReport = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${REPORT_TABLE}?activity_id=eq.${id}`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch report");
        
        const data = await res.json();
            if (data && data.length > 0) {
            const r = data[0];
            setReport({
                id: r.id,
                activity_id: r.activity_id,
                date: r.date,
                start_time: r.start_time,
                end_time: r.end_time,
                address: r.remarks || "No Address Provided",
                photos: r.photo_link || []
            });
        } else {
            setError("Report not found");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-gray-500" /></div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500 gap-2"><AlertCircle /> {error}</div>;
  if (!report) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center font-sans text-black print:p-0 print:bg-white">
        <MaintenanceReportTemplate data={report} />
    </div>
  );
}
