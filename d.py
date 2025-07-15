
import os

# Specify the directory you want to start from
start_path = '/Users/sukhmandeep/PycharmProjects/ufc-fight-predictor'  # Current directory, change to the desired directory if needed

# Open a text file for writing
with open('file_list.txt', 'w') as file:
    # Walk through all directories and files recursively
    for dirpath, dirnames, filenames in os.walk(start_path):
        for filename in filenames:
            # Construct the full file path
            file_path = os.path.join(dirpath, filename)
            file.write(f"File: {file_path}\n")

            # Read the content of the file and write it to the text file
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    file.write(content + '\n')
            except Exception as e:
                file.write(f"Error reading file: {e}\n")

            file.write("\n" + "=" * 50 + "\n\n")

print("File contents saved to file_list.txt")
