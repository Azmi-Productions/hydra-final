import toast from "react-hot-toast";
import CustomToast from "../components/CustomToast";
import ConfirmToast from "../components/ConfirmToast";

// Wrapper for custom toasts
const showToast = (message: string) => {
    // Default to success or generic for direct calls
    toast.custom((t) => <CustomToast t={t} type="success" message={message} />);
};

showToast.success = (message: string) => {
    toast.custom((t) => <CustomToast t={t} type="success" message={message} />);
};

showToast.error = (message: string) => {
    toast.custom((t) => <CustomToast t={t} type="error" message={message} />);
};

showToast.warning = (message: string) => {
    toast.custom((t) => <CustomToast t={t} type="warning" message={message} />);
};


showToast.dismiss = toast.dismiss;

showToast.confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        toast.custom((t) => (
            <ConfirmToast 
                t={t} 
                message={message} 
                onConfirm={() => resolve(true)} 
                onCancel={() => resolve(false)} 
            />
        ), {
            duration: Infinity, // Wait for user interaction
        });
    });
};

export default showToast;

