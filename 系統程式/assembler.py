import os
import tkinter as tk
from tkinter import scrolledtext


class AssemblerApp:
    def __init__(self):
        self.program = []
        self.filename = None
        self.registers = {f'R{i}': 0 for i in range(8)}
        self.memory = {}
        self.pc = 0  # program counter
        self.zero_flag = False
        self.labels = {}  # 在 __init__ 裡新增

    def preprocess_labels(self):
        self.labels = {}
        for idx, line in enumerate(self.program):
            line = line.strip()
            if line.endswith(":"):
                label = line[:-1].strip().upper()
                self.labels[label] = idx

    def load(self, filename):
        try:
            with open(filename, 'r') as f:
                self.program = f.readlines()
                self.filename = filename
                print(f"[Loaded] {filename}")
        except FileNotFoundError:
            print("[Error] File not found.")

    def save(self):
        if not self.filename:
            print("[Error] No original file loaded.")
            return

        dir_path = os.path.dirname(self.filename)
        base_name = "first"
        i = 1
        while True:
            new_filename = os.path.join(dir_path, f"{base_name}({i}).asm")
            if not os.path.exists(new_filename):
                break
            i += 1

        try:
            with open(new_filename, 'w') as f:
                f.writelines(self.program)
                print(f"[Saved] as {new_filename}")
        except Exception as e:
            print(f"[Error] Saving failed: {e}")

    def clear(self):
        self.program = []
        self.registers = {f'R{i}': 0 for i in range(8)}
        self.memory = {}
        self.pc = 0
        print("[Cleared] Program and memory.")

    def list_program(self):
        if not self.program:
            print("[Info] Program is empty.")
        for i, line in enumerate(self.program):
            print(f"{i+1:03}: {line.strip()}")

    def edit(self):
        def save_and_close():
            content = text_area.get("1.0", tk.END).strip().splitlines()
            self.program = [line + '\n' for line in content]
            editor.destroy()
            print("[Edit complete] Program updated.")

        editor = tk.Tk()
        editor.title("Edit Assembly Program")
        editor.geometry("600x400")

        text_area = scrolledtext.ScrolledText(editor, wrap=tk.WORD)
        text_area.pack(fill=tk.BOTH, expand=True)

        # 預設載入目前程式碼
        if self.program:
            text_area.insert(tk.END, "".join(self.program))

        # 儲存按鈕
        save_button = tk.Button(editor, text="儲存並關閉", command=save_and_close)
        save_button.pack(pady=5)

        editor.mainloop()

    def run(self):
        print("[Running program]\n")
        self.pc = 0
        self.zero_flag = False
        self.preprocess_labels()
        while self.pc < len(self.program):
            line = self.program[self.pc].strip()
            result = self.execute_line(line)
            if result == "HALT":
                print("\n[HALT] Execution stopped.")
                break
            elif result == "SKIP":  # label line
                self.pc += 1
                continue
            elif result == "JUMPED":
                continue  # pc 已更新
            self.pc += 1

        self.dump_state()

    def execute_line(self, line):
        if not line or line.startswith(";"):
            return

        # 處理 label 行：例如 LOOP:
        if line.endswith(":"):
            return "SKIP"

        tokens = line.upper().split()
        if not tokens:
            return

        try:
            op = tokens[0]

            if op == "LOAD":
                reg = tokens[1].replace(',', '')
                val = int(tokens[2])
                self.registers[reg] = val
                print(f"LOAD → {reg} = {val}")

            elif op == "ADD":
                reg1 = tokens[1].replace(',', '')
                reg2 = tokens[2]
                self.registers[reg1] += self.registers[reg2]
                print(f"ADD → {reg1} = {self.registers[reg1]}")

            elif op == "SUB":
                reg1 = tokens[1].replace(',', '')
                reg2 = tokens[2]
                self.registers[reg1] -= self.registers[reg2]
                print(f"SUB → {reg1} = {self.registers[reg1]}")

            elif op == "STORE":
                reg = tokens[1].replace(',', '')
                addr = int(tokens[2])
                self.memory[addr] = self.registers[reg]
                print(f"STORE → MEM[{addr}] = {self.registers[reg]}")

            elif op == "CMP":
                reg1 = tokens[1].replace(',', '')
                reg2 = tokens[2]
                self.zero_flag = (self.registers[reg1] == self.registers[reg2])
                print(f"CMP → {reg1} == {reg2} → {self.zero_flag}")

            elif op == "JMP":
                label = tokens[1]
                if label in self.labels:
                    self.pc = self.labels[label]
                    print(f"JMP → 跳至 {label} (行 {self.pc + 1})")
                    return "JUMPED"
                else:
                    print(f"[Error] Label not found: {label}")

            elif op == "JZ":
                label = tokens[1]
                if self.zero_flag:
                    if label in self.labels:
                        self.pc = self.labels[label]
                        print(f"JZ → 跳至 {label} (行 {self.pc + 1})")
                        return "JUMPED"
                    else:
                        print(f"[Error] Label not found: {label}")
                else:
                    print(f"JZ → zero_flag=False → 不跳")

            elif op == "HALT":
                return "HALT"

            else:
                print(f"[Error] Unknown instruction: {op}")

        except Exception as e:
            print(f"[Runtime Error] {line} => {e}")

    def dump_state(self):
        print("\n[Registers]")
        for r, v in self.registers.items():
            print(f"{r}: {v}")

        if self.memory:
            print("\n[Memory]")
            for addr in sorted(self.memory):
                print(f"{addr}: {self.memory[addr]}")
        else:
            print("\n[Memory] (empty)")

    def repl(self):
        while True:
            cmd = input(">>> ").strip().lower()
            if cmd.startswith("load"):
                _, fname = cmd.split(maxsplit=1)
                self.load(fname)
            elif cmd == "save":
                self.save()
            elif cmd in ("clear", "new"):
                self.clear()
            elif cmd == "list":
                self.list_program()
            elif cmd == "edit":
                self.edit()
            elif cmd == "run":
                self.run()
            elif cmd == "exit":
                print("Goodbye.")
                break
            else:
                print("[Error] Unknown command.")


# 啟動程式
if __name__ == "__main__":
    app = AssemblerApp()
    app.repl()
