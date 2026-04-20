import pandas

if __name__== "__main__":
    data = pandas.read_excel("exemple.xlsx", usecols="A:E,G:I,V:X,Z")
    # print(data)
    parent=data[data.profiles == "Parent"]
    student=data[data.profiles.isin(["Lycéen", "Collégien", "Etudiant"])].reset_index(drop=True)
    # print(student)
    # data_to_export=pandas.DataFrame.from_records(student)
    student.to_excel("output.xls")