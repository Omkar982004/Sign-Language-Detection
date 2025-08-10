import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import SignCapture from "./pages/SignCapture";

function App() {
  

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<MainLayout />}>
        <Route index element={<SignCapture />} />
        {/* <Route index element={<HomePage />} /> */}
        {/* <Route path="/jobs" element={<JobsPage />} /> */}
        {/* <Route path="/jobs/:id" element={<JobPage deleteJob={deleteJob} />} loader={jobLoader} /> */}
        {/* <Route path="/add-job" element={<AddJobPage addJobSubmit={addJob} />} /> */}
        {/* <Route path="/edit-job/:id" element={<EditJobPage updateJobSubmit={updateJob}/>} loader={jobLoader} /> */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Route>
    )
  );

  return <RouterProvider router={router} />;
}

export default App;
