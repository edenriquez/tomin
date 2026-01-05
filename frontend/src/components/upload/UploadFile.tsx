import { Upload } from 'lucide-react';
import React, { useState } from 'react';
import { financialService } from '@/services/api';

const UploadFile = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadStatus('');
            // Optional: auto-upload when selected
            uploadFile(file);
        }
    };

    const uploadFile = async (file: File) => {
        setUploadStatus('Uploading...');
        try {
            const data = await financialService.uploadBankStatement(file);
            console.log('Success:', data);
            setUploadStatus('Su estado de cuenta está siendo procesado.');
            // Clear selection after bit of time
            setTimeout(() => {
                setSelectedFile(null);
                setUploadStatus('');
            }, 3000);
        } catch (error) {
            console.error('Error:', error);
            setUploadStatus('Error al subir el archivo.');
        }
    };

    const clickInputFile = () => {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        fileInput.click();
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={() => clickInputFile()}
                disabled={uploadStatus === 'Uploading...'}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50 dark:bg-[#1a2332] dark:bg-white dark:text-black disabled:opacity-50">
                <Upload size={18} />
                {uploadStatus === 'Uploading...' ? 'Subiendo...' : 'Subir Estado de Cuenta'}
                <input
                    type="file"
                    onChange={handleFileChange}
                    hidden
                    id="fileInput"
                    accept=".pdf"
                />
            </button>
            {selectedFile && !uploadStatus.includes('Error') && (
                <p className="text-xs text-gray-500 text-center">Archivo: {selectedFile.name}</p>
            )}
            {uploadStatus && (
                <p className={`text-xs text-center ${uploadStatus.includes('Error') ? 'text-red-500' : 'text-blue-500'}`}>
                    {uploadStatus}
                </p>
            )}
        </div>
    );
};

export default UploadFile;
