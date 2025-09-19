# Use the official Python image from the Docker Hub
FROM python:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file into the container (if you have one)
COPY ./requirements.txt ./

# Ensure pip is up to date
RUN python -m pip install --upgrade pip

# Install any dependencies specified in the requirements file
RUN pip install --no-cache-dir -r requirements.txt --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org

# Copy the rest of the application code into the container
COPY ./test.py /app

# Run the Python script
CMD ["python", "test.py"]