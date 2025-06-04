import os
import tkinter as tk
from tkinter import scrolledtext


class AssemblerApp:
    def __init__(self):
        self.program = []
        self.filename = None
        self.registers = {
            'A': 0, 'X': 0, 'L': 0,
            'B': 0, 'S': 0, 'T': 0,
            'F': 0, 'SW': 0,
            # 加入通用暫存器 R0 ~ R9
            'R0': 0, 'R1': 0, 'R2': 0,
            'R3': 0, 'R4': 0, 'R5': 0,
            'R6': 0, 'R7': 0, 'R8': 0, 'R9': 0
        }


        self.memory = {}
        self.pc = 0  # program counter
        self.registers['SW'] = 0  # 用來儲存比較結果，0=equal, 1=greater, -1=less
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
        self.registers = {
            'A': 0, 'X': 0, 'L': 0,
            'B': 0, 'S': 0, 'T': 0,
            'F': 0, 'SW': 0,
            'R0': 0, 'R1': 0, 'R2': 0,
            'R3': 0, 'R4': 0, 'R5': 0,
            'R6': 0, 'R7': 0, 'R8': 0, 'R9': 0
        }
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
        self.preprocess_labels()
        steps = 0
        MAX_STEPS = 1000  # 防止無限循環

        while self.pc < len(self.program):
            if steps > MAX_STEPS:
                print("[Error] Too many steps. Possible infinite loop.")
                break

            prev_pc = self.pc  # ✅ 定義這行
            line = self.program[self.pc].strip()
            result = self.execute_line(line)
            steps += 1

            if result == "HALT":
                print("\n[HALT] Execution stopped.")
                break
            elif result == "SKIP":
                self.pc += 1
                continue
            elif result == "JUMPED":
                if self.pc == prev_pc:
                    print("[Warning] Jumped to same line. Stopping to avoid infinite loop.")
                    break
                continue

            self.pc += 1


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
                v1 = self.registers[reg1]
                v2 = self.registers[reg2]
                if v1 == v2:
                    self.registers['SW'] = 0
                elif v1 > v2:
                    self.registers['SW'] = 1
                else:
                    self.registers['SW'] = -1
                print(f"CMP → {reg1}({v1}) vs {reg2}({v2}) → SW={self.registers['SW']}")


            elif op == "JMP":
                target = tokens[1]
                if target in self.labels:
                    self.pc = self.labels[target]
                    print(f"JMP → 跳至標籤 {target} (行 {self.pc + 1})")
                    return "JUMPED"
                else:
                    try:
                        line_num = int(target)
                        if 0 <= line_num < len(self.program):
                            self.pc = line_num
                            print(f"JMP → 跳至行號 {line_num + 1}")
                            return "JUMPED"
                        else:
                            print(f"[Error] 無效行號: {line_num}")
                    except ValueError:
                        print(f"[Error] Label not found or invalid number: {target}")


            elif op == "JZ":
                target = tokens[1]
                if self.registers['SW'] == 0:
                    if target in self.labels:
                        self.pc = self.labels[target]
                        print(f"JZ → SW=0 → 跳至標籤 {target} (行 {self.pc + 1})")
                        return "JUMPED"
                    else:
                        try:
                            line_num = int(target)
                            if 0 <= line_num < len(self.program):
                                self.pc = line_num
                                print(f"JZ → SW=0 → 跳至行號 {line_num + 1}")
                                return "JUMPED"
                            else:
                                print(f"[Error] 無效行號: {line_num}")
                        except ValueError:
                            print(f"[Error] Label not found or invalid number: {target}")
                else:
                    print(f"JZ → SW={self.registers['SW']} → 不跳")


            elif op == "JP":
                label = tokens[1]
                if self.registers['SW'] > 0:
                    if label in self.labels:
                        self.pc = self.labels[label]
                        print(f"JP → SW>0 → 跳至 {label} (行 {self.pc + 1})")
                        return "JUMPED"
                    else:
                        print(f"[Error] Label not found: {label}")
                else:
                    print(f"JP → SW={self.registers['SW']} → 不跳")

            elif op == "JN":
                label = tokens[1]
                if self.registers['SW'] < 0:
                    if label in self.labels:
                        self.pc = self.labels[label]
                        print(f"JN → SW<0 → 跳至 {label} (行 {self.pc + 1})")
                        return "JUMPED"
                    else:
                        print(f"[Error] Label not found: {label}")
                else:
                    print(f"JN → SW={self.registers['SW']} → 不跳")


            elif op == "HALT":
                return "HALT"

            else:
                print(f"[Error] Unknown instruction: {op}")
                
            self.print_registers()

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

    def print_registers(self):
        print("\n[Registers]")
        for r, v in self.registers.items():
            print(f"{r}: {v}", end='  ')
        print("\n")


# 啟動程式
if __name__ == "__main__":
    app = AssemblerApp()
    app.repl()
