import type { LaptopSpecs } from "@/lib/types/laptop";
import {
  formatBattery,
  formatStorage,
  formatWeight,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

export function SpecsTable({
  specs,
  className,
}: {
  specs: LaptopSpecs;
  className?: string;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Processor", value: `${specs.processor} (${specs.cores} cores)` },
    {
      label: "Graphics",
      value: specs.gpuVram
        ? `${specs.gpu} · ${specs.gpuVram} GB GDDR6`
        : `${specs.gpu} (integrated)`,
    },
    { label: "Memory", value: `${specs.ram} GB ${specs.ramType}` },
    { label: "Storage", value: `${formatStorage(specs.storage)} ${specs.storageType}` },
    {
      label: "Display",
      value: `${specs.display.size}" ${specs.display.resolution} ${specs.display.panel} · ${specs.display.refreshRate}Hz${specs.display.touch ? " · Touch" : ""}`,
    },
    { label: "Battery", value: `${formatBattery(specs.battery)} rated` },
    { label: "Weight", value: formatWeight(specs.weight) },
    {
      label: "Ports",
      value: (
        <ul className="space-y-1">
          {specs.ports.map((port) => (
            <li key={port}>{port}</li>
          ))}
        </ul>
      ),
    },
    { label: "Keyboard", value: specs.keyboard },
    { label: "Webcam", value: specs.webcam },
    { label: "Wi-Fi", value: specs.wifi },
    { label: "Bluetooth", value: specs.bluetooth },
    { label: "Operating system", value: specs.os },
    { label: "Warranty", value: specs.warranty },
  ];

  return (
    <div className={cn("card-surface overflow-hidden", className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Full specification table</caption>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className={cn(
                "border-b border-ink-900/5 last:border-b-0 dark:border-white/10",
                index % 2 === 1 && "bg-ink-50/60 dark:bg-white/[0.02]",
              )}
            >
              <th
                scope="row"
                className="w-2/5 px-4 py-3 text-left align-top font-medium text-ink-500 sm:w-1/3 sm:px-6 dark:text-ink-400"
              >
                {row.label}
              </th>
              <td className="px-4 py-3 align-top font-medium sm:px-6">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
