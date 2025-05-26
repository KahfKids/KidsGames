import os
from pdf2image import convert_from_path
from PIL import Image
import glob

def create_thumbnails():
    # Get all PDF files from the pdf directory
    pdf_dir = 'read/pdf'
    pdf_files = glob.glob(os.path.join(pdf_dir, '*.pdf'))
    
    for pdf_path in pdf_files:
        try:
            # Get the filename without extension
            filename = os.path.splitext(os.path.basename(pdf_path))[0]
            
            # Convert first page of PDF to image
            images = convert_from_path(pdf_path, first_page=1, last_page=1)
            
            if images:
                # Get the first page
                first_page = images[0]
                
                # Resize to 200x200
                thumbnail = first_page.resize((200, 200), Image.Resampling.LANCZOS)
                
                # Save as PNG in project root
                output_path = f'{filename}.png'
                thumbnail.save(output_path, 'PNG')
                print(f'Created thumbnail for {filename}')
            
        except Exception as e:
            print(f'Error processing {pdf_path}: {str(e)}')

if __name__ == '__main__':
    create_thumbnails() 